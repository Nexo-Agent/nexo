use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeKind {
    Python,
    NodeJs,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxManifest {
    pub python: RuntimeSpec,
    pub nodejs: RuntimeSpec,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeSpec {
    pub version: String,
    pub packages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxRuntimeInfo {
    pub version: String,
    pub installed: bool,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxStatus {
    pub ready: bool,
    pub python: SandboxRuntimeInfo,
    pub nodejs: SandboxRuntimeInfo,
}

#[derive(Debug, Clone)]
pub struct RuntimeHandle {
    pub kind: RuntimeKind,
    pub version: String,
    pub bin_dir: PathBuf,
    pub executables: BTreeMap<String, PathBuf>,
}

impl RuntimeHandle {
    /// Resolve command name to executable path, with optional override.
    pub fn resolve(&self, name: &str, override_path: Option<&str>) -> PathBuf {
        if let Some(path) = override_path.filter(|p| !p.is_empty() && *p != "default") {
            return PathBuf::from(path);
        }

        if let Some(path) = self.executables.get(name) {
            return path.clone();
        }

        // Aliases
        let alias = match name {
            "python3" => Some("python"),
            _ => None,
        };
        if let Some(alias) = alias {
            if let Some(path) = self.executables.get(alias) {
                return path.clone();
            }
        }

        PathBuf::from(name)
    }
}

impl Default for SandboxManifest {
    fn default() -> Self {
        Self {
            python: RuntimeSpec {
                version: "3.13.11".to_string(),
                packages: vec![
                    "numpy".to_string(),
                    "scipy".to_string(),
                    "sympy".to_string(),
                    "statsmodels".to_string(),
                    "scikit-learn".to_string(),
                    "tabulate".to_string(),
                    "matplotlib".to_string(),
                ],
            },
            nodejs: RuntimeSpec {
                version: "22.21.1".to_string(),
                packages: vec!["agent-browser".to_string()],
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_handle() -> RuntimeHandle {
        let python = PathBuf::from("/sandbox/python/bin/python");
        let mut executables = BTreeMap::new();
        executables.insert("python".to_string(), python.clone());
        executables.insert("python3".to_string(), python);
        executables.insert("uv".to_string(), PathBuf::from("/sandbox/bin/uv"));

        RuntimeHandle {
            kind: RuntimeKind::Python,
            version: "3.13.11".to_string(),
            bin_dir: PathBuf::from("/sandbox/python/bin"),
            executables,
        }
    }

    #[test]
    fn resolve_uses_executable_map() {
        let handle = sample_handle();
        assert_eq!(
            handle.resolve("python", None),
            PathBuf::from("/sandbox/python/bin/python")
        );
        assert_eq!(
            handle.resolve("uv", None),
            PathBuf::from("/sandbox/bin/uv")
        );
    }

    #[test]
    fn resolve_uses_alias_for_python3() {
        let mut executables = BTreeMap::new();
        executables.insert(
            "python".to_string(),
            PathBuf::from("/sandbox/python/bin/python"),
        );

        let handle = RuntimeHandle {
            kind: RuntimeKind::Python,
            version: "3.13.11".to_string(),
            bin_dir: PathBuf::from("/sandbox/python/bin"),
            executables,
        };

        assert_eq!(
            handle.resolve("python3", None),
            PathBuf::from("/sandbox/python/bin/python")
        );
    }

    #[test]
    fn resolve_honors_override() {
        let handle = sample_handle();
        assert_eq!(
            handle.resolve("python", Some("/custom/python")),
            PathBuf::from("/custom/python")
        );
        assert_eq!(
            handle.resolve("python", Some("default")),
            PathBuf::from("/sandbox/python/bin/python")
        );
    }

    #[test]
    fn resolve_falls_back_to_name() {
        let handle = sample_handle();
        assert_eq!(handle.resolve("unknown", None), PathBuf::from("unknown"));
    }
}
