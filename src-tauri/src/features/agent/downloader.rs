use anyhow::{Context, Result};
use std::path::Path;
use std::process::Command;
use tokio::fs;
use tokio::io::AsyncWriteExt;

/// Download a file from a URL to a specific path
#[allow(dead_code)]
pub async fn download_file(url: &str, output_path: &Path) -> Result<()> {
    // Create parent directory if it doesn't exist
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).await?;
    }

    let response = reqwest::get(url).await.context("Failed to send request")?;
    if !response.status().is_success() {
        anyhow::bail!("Request failed with status: {}", response.status());
    }

    let content = response
        .bytes()
        .await
        .context("Failed to get response bytes")?;

    let mut file = fs::File::create(output_path)
        .await
        .context("Failed to create file")?;

    file.write_all(&content)
        .await
        .context("Failed to write content to file")?;

    Ok(())
}

/// Clone a git repository
///
/// `repo_url`: The URL of the repository
/// `revision`: The branch, tag, or commit to checkout. Defaults to "HEAD" if None.
/// `output_path`: The destination directory
pub async fn git_clone(
    repo_url: &str,
    revision: Option<&str>,
    output_path: &Path,
) -> Result<String> {
    if output_path.exists() {
        fs::remove_dir_all(output_path)
            .await
            .context("Failed to clean output directory")?;
    }

    // Create parent directory
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).await?;
    }

    // 1. Clone
    let status = Command::new("git")
        .arg("clone")
        .arg("--quiet")
        .arg(repo_url)
        .arg(output_path)
        .status()
        .context("Failed to execute git clone")?;

    if !status.success() {
        anyhow::bail!("Git clone failed");
    }

    // 2. Checkout revision if specified
    if let Some(rev) = revision {
        let status = Command::new("git")
            .current_dir(output_path)
            .arg("checkout")
            .arg("--quiet")
            .arg(rev)
            .status()
            .context("Failed to execute git checkout")?;

        if !status.success() {
            anyhow::bail!("Git checkout failed for revision: {}", rev);
        }
    }

    // 3. Get current commit hash (short)
    let output = Command::new("git")
        .current_dir(output_path)
        .arg("rev-parse")
        .arg("--short")
        .arg("HEAD")
        .output()
        .context("Failed to get git commit hash")?;

    if !output.status.success() {
        anyhow::bail!("Failed to resolve commit hash");
    }

    let commit_hash = String::from_utf8(output.stdout)
        .context("Invalid utf8 in git output")?
        .trim()
        .to_string();

    Ok(commit_hash)
}
