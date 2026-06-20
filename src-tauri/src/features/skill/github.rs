use crate::error::AppError;
use std::io::Read;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GitHubSkillSource {
    pub owner: String,
    pub repo: String,
    pub branch: String,
    pub subpath: Option<String>,
}

/// Parse a GitHub tree URL, archive zip URL, or repo root URL.
pub fn parse_github_url(url: &str) -> Result<GitHubSkillSource, AppError> {
    let url = url.trim();
    if url.is_empty() {
        return Err(AppError::Validation("URL is required".to_string()));
    }

    // Direct archive zip: github.com/{owner}/{repo}/archive/refs/heads/{branch}.zip
    if let Some(caps) = regex::Regex::new(
        r"(?i)^https?://(?:www\.)?github\.com/([^/]+)/([^/]+)/archive/refs/heads/([^/]+)\.zip$",
    )
    .unwrap()
    .captures(url)
    {
        return Ok(GitHubSkillSource {
            owner: caps[1].to_string(),
            repo: caps[2].to_string(),
            branch: caps[3].to_string(),
            subpath: None,
        });
    }

    // Tree URL: github.com/{owner}/{repo}/tree/{branch}/{subpath...}
    if let Some(caps) = regex::Regex::new(
        r"(?i)^https?://(?:www\.)?github\.com/([^/]+)/([^/]+)/tree/([^/]+)(?:/(.*))?$",
    )
    .unwrap()
    .captures(url)
    {
        let subpath = caps
            .get(4)
            .map(|m| {
                let s = m.as_str().trim_end_matches('/');
                s.to_string()
            })
            .filter(|s| !s.is_empty());

        return Ok(GitHubSkillSource {
            owner: caps[1].to_string(),
            repo: caps[2].to_string(),
            branch: caps[3].to_string(),
            subpath,
        });
    }

    // Repo root: github.com/{owner}/{repo}
    if let Some(caps) = regex::Regex::new(r"(?i)^https?://(?:www\.)?github\.com/([^/]+)/([^/]+)/?$")
        .unwrap()
        .captures(url)
    {
        return Ok(GitHubSkillSource {
            owner: caps[1].to_string(),
            repo: caps[2].to_string(),
            branch: "main".to_string(),
            subpath: None,
        });
    }

    Err(AppError::Validation(
        "Invalid GitHub URL. Use a tree URL, archive zip URL, or repository URL.".to_string(),
    ))
}

pub fn build_zip_url(source: &GitHubSkillSource) -> String {
    format!(
        "https://github.com/{}/{}/archive/refs/heads/{}.zip",
        source.owner, source.repo, source.branch
    )
}

pub async fn download_bytes(url: &str) -> Result<Vec<u8>, AppError> {
    let response = reqwest::get(url)
        .await
        .map_err(|e| AppError::Generic(format!("Failed to download: {e}")))?;

    if !response.status().is_success() {
        return Err(AppError::Generic(format!(
            "Download failed with status {}",
            response.status()
        )));
    }

    response
        .bytes()
        .await
        .map(|b| b.to_vec())
        .map_err(|e| AppError::Generic(format!("Failed to read response: {e}")))
}

pub fn extract_zip(bytes: &[u8], dest: &Path) -> Result<(), AppError> {
    std::fs::create_dir_all(dest)
        .map_err(|e| AppError::Generic(format!("Failed to create extract dir: {e}")))?;

    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes))
        .map_err(|e| AppError::Generic(format!("Invalid zip archive: {e}")))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| AppError::Generic(format!("Failed to read zip entry: {e}")))?;
        let outpath = match file.enclosed_name() {
            Some(path) => dest.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| AppError::Generic(format!("Failed to create directory: {e}")))?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| AppError::Generic(format!("Failed to create parent: {e}")))?;
            }
            let mut outfile = std::fs::File::create(&outpath)
                .map_err(|e| AppError::Generic(format!("Failed to create file: {e}")))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| AppError::Generic(format!("Failed to extract file: {e}")))?;
        }
    }

    Ok(())
}

/// Find the single top-level directory GitHub creates: `{repo}-{branch}/`
pub fn find_archive_root(
    extract_dir: &Path,
    repo: &str,
    branch: &str,
) -> Result<PathBuf, AppError> {
    let expected = format!("{repo}-{branch}");
    let expected_path = extract_dir.join(&expected);
    if expected_path.is_dir() {
        return Ok(expected_path);
    }

    // Fallback: single subdirectory
    let mut dirs = Vec::new();
    if let Ok(entries) = std::fs::read_dir(extract_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                dirs.push(entry.path());
            }
        }
    }

    match dirs.len() {
        1 => Ok(dirs.remove(0)),
        0 => Err(AppError::Generic(
            "Archive did not contain a root directory".to_string(),
        )),
        _ => {
            if let Some(path) = dirs.into_iter().find(|p| {
                p.file_name()
                    .and_then(|n| n.to_str())
                    .is_some_and(|n| n.starts_with(repo))
            }) {
                Ok(path)
            } else {
                Err(AppError::Generic(
                    "Could not determine archive root directory".to_string(),
                ))
            }
        }
    }
}

pub fn resolve_skill_dir(archive_root: &Path, subpath: Option<&str>) -> Result<PathBuf, AppError> {
    let candidate = match subpath {
        Some(sp) => archive_root.join(sp),
        None => archive_root.to_path_buf(),
    };

    if candidate.join("SKILL.md").is_file() {
        return Ok(candidate);
    }

    // If subpath points to parent, search immediate children for SKILL.md
    if candidate.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&candidate) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() && path.join("SKILL.md").is_file() {
                    return Ok(path);
                }
            }
        }
    }

    Err(AppError::Validation(
        "No SKILL.md found at the specified path".to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_tree_url() {
        let src =
            parse_github_url("https://github.com/vercel-labs/skills/tree/main/skills/find-skills")
                .unwrap();
        assert_eq!(src.owner, "vercel-labs");
        assert_eq!(src.repo, "skills");
        assert_eq!(src.branch, "main");
        assert_eq!(src.subpath.as_deref(), Some("skills/find-skills"));
    }

    #[test]
    fn parse_zip_url() {
        let src = parse_github_url(
            "https://github.com/magiskboy/agent-skills/archive/refs/heads/main.zip",
        )
        .unwrap();
        assert_eq!(src.owner, "magiskboy");
        assert_eq!(src.repo, "agent-skills");
        assert_eq!(src.branch, "main");
        assert!(src.subpath.is_none());
    }

    #[test]
    fn build_zip_url_from_tree() {
        let src = parse_github_url("https://github.com/o/r/tree/dev/path/to/skill").unwrap();
        assert_eq!(
            build_zip_url(&src),
            "https://github.com/o/r/archive/refs/heads/dev.zip"
        );
    }
}
