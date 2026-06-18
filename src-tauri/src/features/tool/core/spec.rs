use serde_json::Value;
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToolInteraction {
    Immediate,
    AwaitUser,
}

#[derive(Debug, Clone)]
pub struct ToolBehavior {
    pub interaction: ToolInteraction,
    pub default_timeout: Option<Duration>,
    pub sensitive: bool,
}

impl ToolBehavior {
    pub const fn immediate() -> Self {
        Self {
            interaction: ToolInteraction::Immediate,
            default_timeout: Some(Duration::from_secs(60)),
            sensitive: false,
        }
    }

    pub const fn await_user() -> Self {
        Self {
            interaction: ToolInteraction::AwaitUser,
            default_timeout: None,
            sensitive: false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ToolSpec {
    pub name: String,
    pub description: Option<String>,
    pub parameters: Option<Value>,
    pub source_id: String,
    pub source_label: String,
    pub behavior: ToolBehavior,
}

impl ToolSpec {
    pub fn new(
        name: impl Into<String>,
        description: Option<String>,
        parameters: Option<Value>,
        source_id: impl Into<String>,
        source_label: impl Into<String>,
        behavior: ToolBehavior,
    ) -> Self {
        Self {
            name: name.into(),
            description,
            parameters,
            source_id: source_id.into(),
            source_label: source_label.into(),
            behavior,
        }
    }
}
