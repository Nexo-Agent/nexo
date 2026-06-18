use crate::features::browser::factory::{TabSummary, ViewportId, WebviewFactory};
use crate::features::browser::models::BrowserNavigationState;
use crate::error::AppError;
use std::sync::Arc;

pub struct BrowserService {
    factory: Arc<WebviewFactory>,
}

impl BrowserService {
    pub fn new(factory: Arc<WebviewFactory>) -> Self {
        Self { factory }
    }

    pub fn factory(&self) -> &Arc<WebviewFactory> {
        &self.factory
    }

    pub fn init_platform(&self) -> Result<(), AppError> {
        self.factory.init_platform()
    }

    pub async fn create_panel_tab(&self, url: Option<String>) -> Result<String, AppError> {
        self.factory.create_panel_tab(url).await
    }

    pub async fn destroy_panel_tab(&self, tab_id: &str) -> Result<(), AppError> {
        self.factory.destroy_panel_tab(tab_id).await
    }

    pub async fn create_fence_tab(
        &self,
        anchor_id: String,
        chat_id: Option<String>,
        url: String,
    ) -> Result<String, AppError> {
        self.factory
            .create_fence_tab(anchor_id, chat_id, url)
            .await
    }

    pub async fn release_fence_tab(&self, anchor_id: &str) -> Result<(), AppError> {
        self.factory.release_fence_tab(anchor_id).await
    }

    pub async fn release_fences_for_chat(&self, chat_id: &str) -> Result<(), AppError> {
        self.factory.release_fences_for_chat(chat_id).await
    }

    pub async fn list_panel_tabs(&self) -> Result<Vec<TabSummary>, AppError> {
        self.factory.list_panel_tabs().await
    }

    pub async fn get_active_tab(&self) -> Option<String> {
        self.factory.get_active_tab().await
    }

    pub async fn set_active_tab(&self, tab_id: &str) -> Result<(), AppError> {
        self.factory.set_active_tab(tab_id).await
    }

    pub async fn navigate(
        &self,
        tab_id: Option<&str>,
        url: &str,
    ) -> Result<(), AppError> {
        let id = self.factory.resolve_panel_tab(tab_id).await?;
        self.factory.navigate(&id, url).await
    }

    pub async fn get_navigation_state(
        &self,
        tab_id: Option<&str>,
    ) -> Result<BrowserNavigationState, AppError> {
        let id = self.factory.resolve_panel_tab(tab_id).await?;
        self.factory.get_navigation_state(&id).await
    }

    pub async fn go_back(
        &self,
        tab_id: Option<&str>,
    ) -> Result<BrowserNavigationState, AppError> {
        let id = self.factory.resolve_panel_tab(tab_id).await?;
        self.factory.go_back(&id).await
    }

    pub async fn go_forward(
        &self,
        tab_id: Option<&str>,
    ) -> Result<BrowserNavigationState, AppError> {
        let id = self.factory.resolve_panel_tab(tab_id).await?;
        self.factory.go_forward(&id).await
    }

    pub async fn reload(&self, tab_id: Option<&str>) -> Result<(), AppError> {
        let id = self.factory.resolve_panel_tab(tab_id).await?;
        self.factory.reload(&id).await
    }

    pub async fn sync_bounds(
        &self,
        viewport: ViewportId,
        tab_id: &str,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        visible: bool,
    ) -> Result<(), AppError> {
        self.factory
            .sync_bounds(viewport, tab_id, x, y, width, height, visible)
            .await
    }

    pub async fn release_viewport(&self, viewport: ViewportId) -> Result<(), AppError> {
        self.factory.release_viewport(viewport).await
    }

    pub async fn capture_screenshot(&self, tab_id: Option<&str>) -> Result<String, AppError> {
        let id = self.factory.resolve_panel_tab(tab_id).await?;
        self.factory.capture_screenshot(&id).await
    }

    pub async fn get_page_text(
        &self,
        tab_id: Option<&str>,
        max_chars: usize,
    ) -> Result<String, AppError> {
        let id = self.factory.resolve_panel_tab(tab_id).await?;
        self.factory.get_page_text(&id, max_chars).await
    }

    pub async fn get_page_title(&self, tab_id: Option<&str>) -> Result<String, AppError> {
        let id = self.factory.resolve_panel_tab(tab_id).await?;
        self.factory.get_page_title(&id).await
    }

    pub async fn click_selector(
        &self,
        tab_id: Option<&str>,
        selector: &str,
    ) -> Result<(), AppError> {
        let id = self.factory.resolve_panel_tab(tab_id).await?;
        self.factory.click_selector(&id, selector).await
    }

    pub async fn type_text(&self, tab_id: Option<&str>, text: &str) -> Result<(), AppError> {
        let id = self.factory.resolve_panel_tab(tab_id).await?;
        self.factory.type_text(&id, text).await
    }

    pub async fn navigate_or_create_tab(&self, url: &str) -> Result<String, AppError> {
        if let Some(active) = self.get_active_tab().await {
            self.navigate(Some(&active), url).await?;
            return Ok(active);
        }
        let tab_id = self.create_panel_tab(Some(url.to_string())).await?;
        Ok(tab_id)
    }
}
