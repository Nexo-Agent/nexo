use crate::features::browser::factory::history::HistoryState;
use crate::features::browser::factory::lifecycle::WebviewLifecycle;
use crate::features::browser::models::BrowserNavigationState;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TabKind {
    Panel,
    Fence,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabSummary {
    pub tab_id: String,
    pub kind: TabKind,
    pub url: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub anchor_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chat_id: Option<String>,
}

pub struct WebviewInstance {
    pub tab_id: String,
    pub kind: TabKind,
    pub anchor_id: Option<String>,
    pub chat_id: Option<String>,
    pub webview_label: String,
    pub data_dir: PathBuf,
    pub lifecycle: Mutex<WebviewLifecycle>,
    pub nav_state: Arc<Mutex<BrowserNavigationState>>,
    pub history: Arc<Mutex<HistoryState>>,
}

impl WebviewInstance {
    pub fn to_summary(&self, nav: &BrowserNavigationState) -> TabSummary {
        TabSummary {
            tab_id: self.tab_id.clone(),
            kind: self.kind.clone(),
            url: nav.url.clone(),
            title: nav.title.clone(),
            anchor_id: self.anchor_id.clone(),
            chat_id: self.chat_id.clone(),
        }
    }
}
