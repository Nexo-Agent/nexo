use crate::error::AppError;
use std::path::{Path, PathBuf};
use url::Url;

/// Strip Windows verbatim/extended-length prefixes so paths are safe for `Url::from_file_path`.
fn normalize_path_for_file_url(path: &Path) -> PathBuf {
    let lossy = path.to_string_lossy();
    #[cfg(windows)]
    {
        if let Some(stripped) = lossy.strip_prefix(r"\\?\") {
            return PathBuf::from(stripped);
        }
        if let Some(stripped) = lossy.strip_prefix(r"\\?\UNC\") {
            return PathBuf::from(format!(r"\\{}", stripped.replace('/', "\\")));
        }
    }
    path.to_path_buf()
}

/// Convert an absolute filesystem path to a `file:` URL using `std::path::Path` and `url::Url::from_file_path`.
pub fn absolute_path_to_file_url(path: impl AsRef<Path>) -> Result<String, AppError> {
    let path = path.as_ref();
    let trimmed = path.to_string_lossy().trim().to_string();
    if trimmed.is_empty() {
        return Err(AppError::Validation("Path cannot be empty".to_string()));
    }

    let lower = trimmed.to_lowercase();
    if lower.starts_with("file://") {
        return Ok(trimmed);
    }

    let normalized = normalize_path_for_file_url(path);
    Url::from_file_path(&normalized)
        .map(|url| url.to_string())
        .map_err(|()| {
            AppError::Validation(format!(
                "Cannot convert path to file URL: {}",
                normalized.display()
            ))
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_unix_absolute_path() {
        assert_eq!(
            absolute_path_to_file_url("/Users/me/artifacts/chart.html").unwrap(),
            "file:///Users/me/artifacts/chart.html"
        );
    }

    #[test]
    fn passes_through_existing_file_url() {
        let url = "file:///Users/me/chart.html";
        assert_eq!(absolute_path_to_file_url(url).unwrap(), url);
    }

    #[cfg(windows)]
    #[test]
    fn converts_windows_drive_path() {
        assert_eq!(
            absolute_path_to_file_url(r"C:\Users\me\chart.html").unwrap(),
            "file:///C:/Users/me/chart.html"
        );
    }

    #[cfg(windows)]
    #[test]
    fn strips_verbatim_prefix_before_converting() {
        assert_eq!(
            absolute_path_to_file_url(
                r"\\?\C:\Users\nguye\AppData\Roaming\com.nexo.app.dev\artifacts\chart.html"
            )
            .unwrap(),
            "file:///C:/Users/nguye/AppData/Roaming/com.nexo.app.dev/artifacts/chart.html"
        );
    }

    #[cfg(unix)]
    #[test]
    fn encodes_spaces_in_path_segments() {
        assert_eq!(
            absolute_path_to_file_url("/Users/me/my chart.html").unwrap(),
            "file:///Users/me/my%20chart.html"
        );
    }
}
