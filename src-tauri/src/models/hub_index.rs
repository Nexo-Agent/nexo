use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HubIndex {
    pub version: String,
    pub last_updated: String,
    pub hub_name: String,
    pub resources: HubResources,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HubResources {
    pub prompts: Vec<HubPrompt>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HubPrompt {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub path: String,
}
