use serde::{Deserialize, Serialize};

// Remote index.yaml structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddonIndex {
    pub addons: Addons,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Addons {
    pub python: PythonAddon,
    pub nodejs: NodeJsAddon,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonAddon {
    pub versions: Vec<String>,
    pub uv: UvConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UvConfig {
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeJsAddon {
    pub versions: Vec<String>,
}

// Default configuration
impl Default for AddonIndex {
    fn default() -> Self {
        Self {
            addons: Addons {
                python: PythonAddon {
                    versions: vec![
                        "3.12.12".to_string(),
                        "3.13.11".to_string(),
                        "3.14.2".to_string(),
                    ],
                    uv: UvConfig {
                        version: "0.9.21".to_string(),
                    },
                },
                nodejs: NodeJsAddon {
                    versions: vec![
                        "20.19.6".to_string(),
                        "22.21.1".to_string(),
                        "24.12.0".to_string(),
                    ],
                },
            },
        }
    }
}

// Remote config URL (you should host this somewhere)
pub const REMOTE_INDEX_URL: &str =
    "https://raw.githubusercontent.com/your-repo/nexo-addons/main/index.yaml";
