use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ViewportKind {
    MainPanel,
    Fence,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ViewportId {
    pub kind: ViewportKind,
    pub anchor_id: Option<String>,
}

impl ViewportId {
    pub fn main_panel() -> Self {
        Self {
            kind: ViewportKind::MainPanel,
            anchor_id: None,
        }
    }

    pub fn fence(anchor_id: impl Into<String>) -> Self {
        Self {
            kind: ViewportKind::Fence,
            anchor_id: Some(anchor_id.into()),
        }
    }
}

#[derive(Debug, Default)]
pub struct ViewportLeaseManager {
    leases: HashMap<ViewportId, String>,
}

impl ViewportLeaseManager {
    pub fn set_lease(&mut self, viewport: ViewportId, tab_id: String) -> Option<String> {
        self.leases.insert(viewport, tab_id)
    }

    pub fn release(&mut self, viewport: &ViewportId) -> Option<String> {
        self.leases.remove(viewport)
    }

    pub fn tab_for_viewport(&self, viewport: &ViewportId) -> Option<&String> {
        self.leases.get(viewport)
    }
}
