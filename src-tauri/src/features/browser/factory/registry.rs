use crate::features::browser::factory::instance::{TabKind, TabSummary, WebviewInstance};
use crate::features::browser::models::BrowserNavigationState;
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Default)]
pub struct WebviewRegistry {
    tabs: HashMap<String, Arc<WebviewInstance>>,
    panel_tab_order: Vec<String>,
    active_tab_id: Option<String>,
    fence_anchors: HashMap<String, String>,
}

impl WebviewRegistry {
    pub fn insert(&mut self, instance: Arc<WebviewInstance>) {
        let tab_id = instance.tab_id.clone();
        if instance.kind == TabKind::Panel {
            if !self.panel_tab_order.contains(&tab_id) {
                self.panel_tab_order.push(tab_id.clone());
            }
            if self.active_tab_id.is_none() {
                self.active_tab_id = Some(tab_id.clone());
            }
        }
        if let Some(anchor_id) = &instance.anchor_id {
            self.fence_anchors
                .insert(anchor_id.clone(), tab_id.clone());
        }
        self.tabs.insert(tab_id, instance);
    }

    pub fn remove(&mut self, tab_id: &str) -> Option<Arc<WebviewInstance>> {
        let removed = self.tabs.remove(tab_id)?;
        if removed.kind == TabKind::Panel {
            self.panel_tab_order.retain(|id| id != tab_id);
            if self.active_tab_id.as_deref() == Some(tab_id) {
                self.active_tab_id = self.panel_tab_order.last().cloned();
            }
        }
        if let Some(anchor_id) = &removed.anchor_id {
            self.fence_anchors.remove(anchor_id);
        }
        Some(removed)
    }

    pub fn get(&self, tab_id: &str) -> Option<Arc<WebviewInstance>> {
        self.tabs.get(tab_id).cloned()
    }

    pub fn tab_id_for_anchor(&self, anchor_id: &str) -> Option<String> {
        self.fence_anchors.get(anchor_id).cloned()
    }

    pub fn active_tab_id(&self) -> Option<&String> {
        self.active_tab_id.as_ref()
    }

    pub fn set_active_tab(&mut self, tab_id: &str) -> bool {
        if !self.tabs.get(tab_id).is_some_and(|t| t.kind == TabKind::Panel) {
            return false;
        }
        self.active_tab_id = Some(tab_id.to_string());
        true
    }

    pub fn panel_tab_ids(&self) -> &[String] {
        &self.panel_tab_order
    }

    pub fn list_panel_summaries(
        &self,
        nav_states: &HashMap<String, BrowserNavigationState>,
    ) -> Vec<TabSummary> {
        self.panel_tab_order
            .iter()
            .filter_map(|id| {
                let tab = self.tabs.get(id)?;
                let nav = nav_states
                    .get(id)
                    .cloned()
                    .unwrap_or_else(|| BrowserNavigationState {
                        url: String::new(),
                        title: String::new(),
                        can_go_back: false,
                        can_go_forward: false,
                    });
                Some(tab.to_summary(&nav))
            })
            .collect()
    }

    pub fn fence_tab_ids_for_chat(&self, chat_id: &str) -> Vec<String> {
        let prefix = format!("{chat_id}:");
        self.tabs
            .values()
            .filter(|t| {
                t.kind == TabKind::Fence
                    && t.chat_id.as_deref() == Some(chat_id)
                    || t.anchor_id
                        .as_deref()
                        .is_some_and(|a| a.starts_with(&prefix))
            })
            .map(|t| t.tab_id.clone())
            .collect()
    }
}
