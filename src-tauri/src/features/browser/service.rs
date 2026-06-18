use crate::constants::events::TauriEvents;
use crate::error::AppError;
use crate::events::{
    BrowserErrorEvent, BrowserFrameEvent, BrowserNavigatedEvent, BrowserSessionStartedEvent,
    BrowserSessionStoppedEvent,
};
use crate::features::browser::input::{map_input_event, CdpInputCommand};
use crate::features::browser::install::ChromeRuntimeInstaller;
use crate::features::browser::models::{validate_url, BrowserInputEvent, BrowserNavigationState};
use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::cdp::browser_protocol::emulation::SetDeviceMetricsOverrideParams;
use chromiumoxide::cdp::browser_protocol::page::{
    GetNavigationHistoryParams, NavigateParams, NavigateToHistoryEntryParams,
    ScreencastFrameAckParams, StartScreencastFormat, StartScreencastParams, StopScreencastParams,
};
use chromiumoxide::page::Page;
use futures::StreamExt;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{oneshot, Mutex, RwLock};
use tokio::task::JoinHandle;
use uuid::Uuid;

struct SessionInner {
    session_id: String,
    chat_id: Option<String>,
    browser: Mutex<Browser>,
    handler_task: JoinHandle<()>,
    page: Page,
    screencast_task: JoinHandle<()>,
    viewer_active: Arc<RwLock<bool>>,
    shutdown_tx: Mutex<Option<oneshot::Sender<()>>>,
}

pub struct BrowserService {
    app: Arc<AppHandle>,
    sessions: Arc<Mutex<HashMap<String, Arc<SessionInner>>>>,
    chat_sessions: Arc<Mutex<HashMap<String, String>>>,
}

impl BrowserService {
    pub fn new(app: Arc<AppHandle>) -> Self {
        Self {
            app,
            sessions: Arc::new(Mutex::new(HashMap::new())),
            chat_sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn ensure_runtime(&self) -> Result<(), AppError> {
        ChromeRuntimeInstaller::ensure_installed(&self.app).await
    }

    pub fn runtime_status(&self) -> crate::features::browser::models::BrowserRuntimeStatus {
        crate::features::browser::models::BrowserRuntimeStatus {
            installed: ChromeRuntimeInstaller::is_installed(&self.app),
            version: ChromeRuntimeInstaller::installed_version_dir(&self.app)
                .ok()
                .flatten()
                .and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_string())),
            downloading: false,
        }
    }

    pub async fn create_session(
        &self,
        chat_id: Option<String>,
        url: Option<String>,
        width: Option<u32>,
        height: Option<u32>,
    ) -> Result<String, AppError> {
        self.ensure_runtime().await?;

        if let Some(ref cid) = chat_id {
            let chat_sessions = self.chat_sessions.lock().await;
            if let Some(existing) = chat_sessions.get(cid) {
                if let Some(url) = url {
                    self.navigate(existing, &url).await?;
                }
                return Ok(existing.clone());
            }
        }

        let session_id = Uuid::new_v4().to_string();
        let chrome_path = ChromeRuntimeInstaller::get_executable_path(&self.app)?;
        let profile_dir = self.session_profile_dir(&session_id)?;
        std::fs::create_dir_all(&profile_dir)?;

        let viewport_w = width.unwrap_or(1280);
        let viewport_h = height.unwrap_or(720);

        let config = BrowserConfig::builder()
            .chrome_executable(chrome_path)
            .arg("--headless=new")
            .arg("--disable-gpu")
            .arg("--no-sandbox")
            .arg("--disable-dev-shm-usage")
            .arg(format!("--user-data-dir={}", profile_dir.display()))
            .arg(format!("--window-size={viewport_w},{viewport_h}"))
            .arg("--remote-allow-origins=*")
            .build()
            .map_err(|e| AppError::Generic(e.to_string()))?;

        let (browser, mut handler) = Browser::launch(config)
            .await
            .map_err(|e| AppError::Generic(format!("Failed to launch Chromium: {e}")))?;

        let handler_task = tokio::spawn(async move {
            while handler.next().await.is_some() {}
        });

        let page = browser
            .new_page("about:blank")
            .await
            .map_err(|e| AppError::Generic(format!("Failed to create page: {e}")))?;

        page.execute(
            SetDeviceMetricsOverrideParams::builder()
                .width(viewport_w as i64)
                .height(viewport_h as i64)
                .device_scale_factor(1.0)
                .mobile(false)
                .build()
                .expect("device metrics"),
        )
        .await
        .map_err(|e| AppError::Generic(format!("Failed to set viewport: {e}")))?;

        let viewer_active = Arc::new(RwLock::new(false));
        let (shutdown_tx, shutdown_rx) = oneshot::channel();
        let screencast_task = spawn_screencast_loop(
            self.app.clone(),
            session_id.clone(),
            page.clone(),
            viewer_active.clone(),
            shutdown_rx,
        );

        let chat_id_for_event = chat_id.clone();
        let inner = Arc::new(SessionInner {
            session_id: session_id.clone(),
            chat_id,
            browser: Mutex::new(browser),
            handler_task,
            page,
            screencast_task,
            viewer_active,
            shutdown_tx: Mutex::new(Some(shutdown_tx)),
        });

        self.sessions
            .lock()
            .await
            .insert(session_id.clone(), inner);

        if let Some(cid) = chat_id_for_event.clone() {
            self.chat_sessions
                .lock()
                .await
                .insert(cid, session_id.clone());
        }

        let _ = self.app.emit(
            TauriEvents::BROWSER_SESSION_STARTED,
            BrowserSessionStartedEvent {
                session_id: session_id.clone(),
                chat_id: chat_id_for_event,
            },
        );

        if let Some(url) = url {
            self.navigate(&session_id, &url).await?;
        }

        Ok(session_id)
    }

    pub async fn navigate(&self, session_id: &str, url: &str) -> Result<(), AppError> {
        let validated = validate_url(url)?;
        let session = self.get_session(session_id).await?;
        session
            .page
            .execute(NavigateParams::new(validated.clone()))
            .await
            .map_err(|e| AppError::Generic(format!("Navigate failed: {e}")))?;

        let _ = self.app.emit(
            TauriEvents::BROWSER_NAVIGATED,
            BrowserNavigatedEvent {
                session_id: session_id.to_string(),
                url: validated,
            },
        );
        Ok(())
    }

    pub async fn destroy_session(&self, session_id: &str) -> Result<(), AppError> {
        let session = self.sessions.lock().await.remove(session_id);

        if let Some(session) = session {
            if let Some(chat_id) = &session.chat_id {
                let mut chat_sessions = self.chat_sessions.lock().await;
                if chat_sessions.get(chat_id) == Some(&session_id.to_string()) {
                    chat_sessions.remove(chat_id);
                }
            }
            if let Some(tx) = session.shutdown_tx.lock().await.take() {
                let _ = tx.send(());
            }
            session.screencast_task.abort();
            if let Ok(mut browser) = session.browser.try_lock() {
                let _ = browser.close().await;
            }
            session.handler_task.abort();
            if let Ok(profile_dir) = self.session_profile_dir(session_id) {
                let _ = std::fs::remove_dir_all(profile_dir);
            }
        }

        let _ = self.app.emit(
            TauriEvents::BROWSER_SESSION_STOPPED,
            BrowserSessionStoppedEvent {
                session_id: session_id.to_string(),
            },
        );
        Ok(())
    }

    pub async fn get_navigation_state(
        &self,
        session_id: &str,
    ) -> Result<BrowserNavigationState, AppError> {
        let session = self.get_session(session_id).await?;
        Self::navigation_state_from_page(&session.page).await
    }

    pub async fn go_back(&self, session_id: &str) -> Result<BrowserNavigationState, AppError> {
        let session = self.get_session(session_id).await?;
        let history = Self::fetch_navigation_history(&session.page).await?;
        let current = history.current_index as usize;
        if current == 0 {
            return Self::navigation_state_from_history(&history);
        }
        let entry_id = history.entries[current - 1].id;
        session
            .page
            .execute(NavigateToHistoryEntryParams::new(entry_id))
            .await
            .map_err(|e| AppError::Generic(format!("Go back failed: {e}")))?;
        let state = Self::navigation_state_from_page(&session.page).await?;
        let _ = self.app.emit(
            TauriEvents::BROWSER_NAVIGATED,
            BrowserNavigatedEvent {
                session_id: session_id.to_string(),
                url: state.url.clone(),
            },
        );
        Ok(state)
    }

    pub async fn go_forward(&self, session_id: &str) -> Result<BrowserNavigationState, AppError> {
        let session = self.get_session(session_id).await?;
        let history = Self::fetch_navigation_history(&session.page).await?;
        let current = history.current_index as usize;
        if current + 1 >= history.entries.len() {
            return Self::navigation_state_from_history(&history);
        }
        let entry_id = history.entries[current + 1].id;
        session
            .page
            .execute(NavigateToHistoryEntryParams::new(entry_id))
            .await
            .map_err(|e| AppError::Generic(format!("Go forward failed: {e}")))?;
        let state = Self::navigation_state_from_page(&session.page).await?;
        let _ = self.app.emit(
            TauriEvents::BROWSER_NAVIGATED,
            BrowserNavigatedEvent {
                session_id: session_id.to_string(),
                url: state.url.clone(),
            },
        );
        Ok(state)
    }

    pub async fn send_input(
        &self,
        session_id: &str,
        event: BrowserInputEvent,
    ) -> Result<(), AppError> {
        let session = self.get_session(session_id).await?;
        for cmd in map_input_event(&event) {
            match cmd {
                CdpInputCommand::Mouse(params) => {
                    session
                        .page
                        .execute(params)
                        .await
                        .map_err(|e| AppError::Generic(e.to_string()))?;
                }
                CdpInputCommand::Key(params) => {
                    session
                        .page
                        .execute(params)
                        .await
                        .map_err(|e| AppError::Generic(e.to_string()))?;
                }
                CdpInputCommand::Text(params) => {
                    session
                        .page
                        .execute(params)
                        .await
                        .map_err(|e| AppError::Generic(e.to_string()))?;
                }
            }
        }
        Ok(())
    }

    pub async fn set_viewer_active(&self, session_id: &str, active: bool) -> Result<(), AppError> {
        let session = self.get_session(session_id).await?;
        *session.viewer_active.write().await = active;
        Ok(())
    }

    pub async fn resize(
        &self,
        session_id: &str,
        width: u32,
        height: u32,
    ) -> Result<(), AppError> {
        let session = self.get_session(session_id).await?;
        session
            .page
            .execute(
                SetDeviceMetricsOverrideParams::builder()
                    .width(width as i64)
                    .height(height as i64)
                    .device_scale_factor(1.0)
                    .mobile(false)
                    .build()
                    .expect("device metrics"),
            )
            .await
            .map_err(|e| AppError::Generic(e.to_string()))?;
        Ok(())
    }

    pub async fn capture_screenshot(&self, session_id: &str) -> Result<String, AppError> {
        let session = self.get_session(session_id).await?;
        let bytes = session
            .page
            .screenshot(chromiumoxide::page::ScreenshotParams::builder().build())
            .await
            .map_err(|e| AppError::Generic(e.to_string()))?;
        Ok(base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            bytes,
        ))
    }

    pub async fn get_page_text(
        &self,
        session_id: &str,
        max_chars: usize,
    ) -> Result<String, AppError> {
        let session = self.get_session(session_id).await?;
        let script = format!(
            r#"(() => {{
                const text = document.body?.innerText ?? '';
                return text.slice(0, {max_chars});
            }})()"#
        );
        let value = session
            .page
            .evaluate(script)
            .await
            .map_err(|e| AppError::Generic(e.to_string()))?
            .into_value::<String>()
            .map_err(|e| AppError::Generic(e.to_string()))?;
        Ok(value)
    }

    pub async fn get_page_title(&self, session_id: &str) -> Result<String, AppError> {
        let session = self.get_session(session_id).await?;
        Ok(session.page.get_title().await.unwrap_or_default().unwrap_or_default())
    }

    pub async fn click_selector(&self, session_id: &str, selector: &str) -> Result<(), AppError> {
        let session = self.get_session(session_id).await?;
        let script = format!(
            r#"(() => {{
                const el = document.querySelector({selector:?});
                if (!el) throw new Error('Element not found');
                const rect = el.getBoundingClientRect();
                return {{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }};
            }})()"#
        );
        let point = session
            .page
            .evaluate(script)
            .await
            .map_err(|e| AppError::Generic(e.to_string()))?
            .into_value::<serde_json::Value>()
            .map_err(|e| AppError::Generic(e.to_string()))?;
        let x = point["x"].as_f64().unwrap_or(0.0);
        let y = point["y"].as_f64().unwrap_or(0.0);
        self.send_input(
            session_id,
            BrowserInputEvent::MousePressed {
                x,
                y,
                button: "left".to_string(),
                click_count: 1,
            },
        )
        .await?;
        self.send_input(
            session_id,
            BrowserInputEvent::MouseReleased {
                x,
                y,
                button: "left".to_string(),
                click_count: 1,
            },
        )
        .await?;
        Ok(())
    }

    pub async fn session_for_chat(&self, chat_id: &str) -> Option<String> {
        self.chat_sessions.lock().await.get(chat_id).cloned()
    }

    async fn get_session(&self, session_id: &str) -> Result<Arc<SessionInner>, AppError> {
        self.sessions
            .lock()
            .await
            .get(session_id)
            .cloned()
            .ok_or_else(|| AppError::NotFound(format!("Browser session not found: {session_id}")))
    }

    fn session_profile_dir(&self, session_id: &str) -> Result<PathBuf, AppError> {
        let app_data = self
            .app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Generic(e.to_string()))?;
        Ok(app_data.join("browser-sessions").join(session_id))
    }

    async fn fetch_navigation_history(
        page: &Page,
    ) -> Result<
        chromiumoxide::cdp::browser_protocol::page::GetNavigationHistoryReturns,
        AppError,
    > {
        let response = page
            .execute(GetNavigationHistoryParams::default())
            .await
            .map_err(|e| AppError::Generic(format!("Get navigation history failed: {e}")))?;
        Ok(response.result)
    }

    async fn navigation_state_from_page(page: &Page) -> Result<BrowserNavigationState, AppError> {
        let history = Self::fetch_navigation_history(page).await?;
        Self::navigation_state_from_history(&history)
    }

    fn navigation_state_from_history(
        history: &chromiumoxide::cdp::browser_protocol::page::GetNavigationHistoryReturns,
    ) -> Result<BrowserNavigationState, AppError> {
        let current = history.current_index as usize;
        let entries = &history.entries;
        let entry = entries.get(current);
        Ok(BrowserNavigationState {
            url: entry.map(|e| e.url.clone()).unwrap_or_default(),
            title: entry.map(|e| e.title.clone()).unwrap_or_default(),
            can_go_back: current > 0,
            can_go_forward: current + 1 < entries.len(),
        })
    }
}

fn spawn_screencast_loop(
    app: Arc<AppHandle>,
    session_id: String,
    page: Page,
    viewer_active: Arc<RwLock<bool>>,
    mut shutdown_rx: oneshot::Receiver<()>,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        if let Err(e) = page
            .execute(StartScreencastParams {
                format: Some(StartScreencastFormat::Jpeg),
                quality: Some(70),
                max_width: Some(1280),
                max_height: Some(720),
                every_nth_frame: Some(1),
            })
            .await
        {
            let _ = app.emit(
                TauriEvents::BROWSER_ERROR,
                BrowserErrorEvent {
                    session_id: session_id.clone(),
                    error: format!("startScreencast failed: {e}"),
                },
            );
            return;
        }

        let mut events = match page
            .event_listener::<chromiumoxide::cdp::browser_protocol::page::EventScreencastFrame>()
            .await
        {
            Ok(e) => e,
            Err(e) => {
                let _ = app.emit(
                    TauriEvents::BROWSER_ERROR,
                    BrowserErrorEvent {
                        session_id: session_id.clone(),
                        error: format!("screencast listener failed: {e}"),
                    },
                );
                return;
            }
        };

        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    let _ = page.execute(StopScreencastParams::default()).await;
                    break;
                }
                maybe_frame = events.next() => {
                    match maybe_frame {
                        Some(frame) => {
                            let frame_data: String = frame.data.clone().into();
                            let _ = page.execute(ScreencastFrameAckParams::new(frame.session_id)).await;

                            let active = *viewer_active.read().await;
                            if active {
                                let timestamp = SystemTime::now()
                                    .duration_since(UNIX_EPOCH)
                                    .map(|d| d.as_millis() as u64)
                                    .unwrap_or(0);

                                let _ = app.emit(
                                    TauriEvents::BROWSER_FRAME,
                                    BrowserFrameEvent {
                                        session_id: session_id.clone(),
                                        data: frame_data,
                                        timestamp,
                                        viewport_width: frame.metadata.device_width as u32,
                                        viewport_height: frame.metadata.device_height as u32,
                                    },
                                );
                            }

                            let delay_ms = if active { 100 } else { 500 };
                            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
                        }
                        None => break,
                    }
                }
            }
        }
    })
}
