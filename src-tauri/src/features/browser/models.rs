use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserNavigationState {
    pub url: String,
    pub title: String,
    pub can_go_back: bool,
    pub can_go_forward: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTabResponse {
    pub tab_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListTabsResponse {
    pub tabs: Vec<crate::features::browser::factory::TabSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetActiveTabResponse {
    pub tab_id: Option<String>,
}

pub fn validate_url(url: &str) -> Result<String, crate::error::AppError> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err(crate::error::AppError::Validation(
            "URL cannot be empty".to_string(),
        ));
    }
    let lower = trimmed.to_lowercase();
    if lower.starts_with("javascript:") || lower.starts_with("data:") {
        return Err(crate::error::AppError::Validation(
            "URL scheme not allowed".to_string(),
        ));
    }
    if lower.starts_with("http://") || lower.starts_with("https://") || lower.starts_with("file://")
    {
        return Ok(trimmed.to_string());
    }
    if is_absolute_filesystem_path(trimmed) {
        return Ok(absolute_path_to_file_url(trimmed));
    }
    Err(crate::error::AppError::Validation(
        "URL must use http, https, or file scheme".to_string(),
    ))
}

fn is_absolute_filesystem_path(path: &str) -> bool {
    path.starts_with('/') || path.starts_with('\\') || looks_like_windows_drive_path(path)
}

fn looks_like_windows_drive_path(path: &str) -> bool {
    let bytes = path.as_bytes();
    bytes.len() >= 3
        && bytes[0].is_ascii_alphabetic()
        && bytes[1] == b':'
        && (bytes[2] == b'\\' || bytes[2] == b'/')
}

fn absolute_path_to_file_url(path: &str) -> String {
    let mut posix = path.replace('\\', "/");
    if looks_like_windows_drive_path(path) && !posix.starts_with('/') {
        posix = format!("/{posix}");
    }
    format!("file://{posix}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_https_urls() {
        assert!(validate_url("https://example.com").is_ok());
    }

    #[test]
    fn rejects_javascript_urls() {
        assert!(validate_url("javascript:alert(1)").is_err());
    }

    #[test]
    fn normalizes_absolute_path_to_file_url() {
        assert_eq!(
            validate_url("/Users/me/chart.html").unwrap(),
            "file:///Users/me/chart.html"
        );
    }

    #[test]
    fn allows_file_urls() {
        assert!(validate_url("file:///Users/me/chart.html").is_ok());
    }

    #[test]
    fn create_tab_response_uses_snake_case() {
        let response = CreateTabResponse {
            tab_id: "abc".to_string(),
        };
        let json = serde_json::to_value(&response).unwrap();
        assert_eq!(json["tab_id"], "abc");
        assert!(json.get("tabId").is_none());
    }
}
