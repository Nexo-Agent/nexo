use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserNavigationState {
    pub url: String,
    pub title: String,
    pub can_go_back: bool,
    pub can_go_forward: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSessionResponse {
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserRuntimeStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub downloading: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum BrowserInputEvent {
    MousePressed {
        x: f64,
        y: f64,
        button: String,
        #[serde(rename = "clickCount")]
        click_count: u32,
    },
    MouseReleased {
        x: f64,
        y: f64,
        button: String,
        #[serde(rename = "clickCount")]
        click_count: u32,
    },
    MouseMoved {
        x: f64,
        y: f64,
    },
    MouseWheel {
        x: f64,
        y: f64,
        #[serde(rename = "deltaX")]
        delta_x: f64,
        #[serde(rename = "deltaY")]
        delta_y: f64,
    },
    KeyDown {
        key: String,
        code: String,
    },
    KeyUp {
        key: String,
        code: String,
    },
    InsertText {
        text: String,
    },
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
    fn create_session_response_uses_snake_case() {
        let response = CreateSessionResponse {
            session_id: "abc".to_string(),
        };
        let json = serde_json::to_value(&response).unwrap();
        assert_eq!(json["session_id"], "abc");
        assert!(json.get("sessionId").is_none());
    }

    #[test]
    fn deserializes_frontend_mouse_event() {
        let json = r#"{"type":"mousePressed","x":10.0,"y":20.0,"button":"left","clickCount":1}"#;
        let event: BrowserInputEvent = serde_json::from_str(json).unwrap();
        match event {
            BrowserInputEvent::MousePressed { click_count, .. } => assert_eq!(click_count, 1),
            _ => panic!("expected mousePressed"),
        }
    }

    #[test]
    fn deserializes_frontend_insert_text_event() {
        let json = r#"{"type":"insertText","text":"hello"}"#;
        let event: BrowserInputEvent = serde_json::from_str(json).unwrap();
        match event {
            BrowserInputEvent::InsertText { text } => assert_eq!(text, "hello"),
            _ => panic!("expected insertText"),
        }
    }
}
