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

// URL templates as constants
pub const PYTHON_RELEASE_DATE: &str = "20251217";

pub const PYTHON_DOWNLOAD_TEMPLATE: &str = 
    "https://github.com/astral-sh/python-build-standalone/releases/download/{release_date}/cpython-{version}+{release_date}-{platform}-install_only.tar.gz";

pub const UV_DOWNLOAD_TEMPLATE: &str = 
    "https://github.com/astral-sh/uv/releases/download/{version}/uv-{platform}.{ext}";

pub const NODEJS_DOWNLOAD_TEMPLATE: &str = 
    "https://nodejs.org/dist/v{version}/node-v{version}-{platform}.{ext}";

// Remote config URL (you should host this somewhere)
pub const REMOTE_INDEX_URL: &str = 
    "https://raw.githubusercontent.com/your-repo/nexo-addons/main/index.yaml";
