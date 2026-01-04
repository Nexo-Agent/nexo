use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    tauri_build::build();

    // Download UV binary for current platform and bundle as sidecar
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let binaries_dir = manifest_dir.join("binaries");

    // Create binaries directory if it doesn't exist
    fs::create_dir_all(&binaries_dir).expect("Failed to create binaries directory");

    // UV version to bundle
    let uv_version = "0.9.21";

    // Determine current platform and UV binary details
    let (target_triple, url, binary_name) = if cfg!(all(
        target_os = "macos",
        target_arch = "aarch64"
    )) {
        (
            "aarch64-apple-darwin",
            format!("https://github.com/astral-sh/uv/releases/download/{}/uv-aarch64-apple-darwin.tar.gz", uv_version),
            "uv",
        )
    } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
        (
            "x86_64-apple-darwin",
            format!("https://github.com/astral-sh/uv/releases/download/{}/uv-x86_64-apple-darwin.tar.gz", uv_version),
            "uv",
        )
    } else if cfg!(target_os = "windows") {
        (
            "x86_64-pc-windows-msvc",
            format!("https://github.com/astral-sh/uv/releases/download/{}/uv-x86_64-pc-windows-msvc.zip", uv_version),
            "uv.exe",
        )
    } else {
        (
            "x86_64-unknown-linux-gnu",
            format!("https://github.com/astral-sh/uv/releases/download/{}/uv-x86_64-unknown-linux-gnu.tar.gz", uv_version),
            "uv",
        )
    };

    println!("cargo:rerun-if-changed=build.rs");

    let output_path = binaries_dir.join(binary_name);

    // Skip if binary already exists
    if output_path.exists() {
        println!("UV binary already exists at: {}", output_path.display());
        return;
    }

    println!("Downloading UV {} for {}", uv_version, target_triple);

    // Use curl to download (cross-platform)
    let temp_file = out_dir.join(format!("uv-{}.tmp", target_triple));

    let status = std::process::Command::new("curl")
        .args(&["-L", "-o", temp_file.to_str().unwrap(), &url])
        .status()
        .expect("Failed to execute curl");

    if !status.success() {
        eprintln!("Failed to download UV for {}", target_triple);
        return;
    }

    // Extract the binary
    if url.ends_with(".tar.gz") {
        // Extract tar.gz
        let extract_dir = out_dir.join(format!("uv-extract-{}", target_triple));
        fs::create_dir_all(&extract_dir).expect("Failed to create extract directory");

        let status = std::process::Command::new("tar")
            .args(&[
                "xzf",
                temp_file.to_str().unwrap(),
                "-C",
                extract_dir.to_str().unwrap(),
            ])
            .status()
            .expect("Failed to extract tar.gz");

        if status.success() {
            // Find the uv binary in the extracted directory
            let source = find_file(&extract_dir, binary_name)
                .expect(&format!("UV binary not found for {}", target_triple));

            fs::copy(&source, &output_path).expect("Failed to copy UV binary");

            // Set executable permissions on Unix platforms
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let metadata = fs::metadata(&output_path).expect("Failed to get metadata");
                let mut permissions = metadata.permissions();
                permissions.set_mode(0o755);
                fs::set_permissions(&output_path, permissions).expect("Failed to set permissions");
            }

            println!("UV binary installed at: {}", output_path.display());
        }
    } else if url.ends_with(".zip") {
        // Extract zip (Windows)
        let extract_dir = out_dir.join(format!("uv-extract-{}", target_triple));
        fs::create_dir_all(&extract_dir).expect("Failed to create extract directory");

        // Use PowerShell to extract on Windows
        #[cfg(target_os = "windows")]
        {
            let status = std::process::Command::new("powershell")
                .args(&[
                    "-Command",
                    &format!(
                        "Expand-Archive -Path '{}' -DestinationPath '{}'",
                        temp_file.display(),
                        extract_dir.display()
                    ),
                ])
                .status()
                .expect("Failed to extract zip");

            if status.success() {
                let source = find_file(&extract_dir, binary_name)
                    .expect(&format!("UV binary not found for {}", target_triple));
                fs::copy(&source, &output_path).expect("Failed to copy UV binary");
                println!("UV binary installed at: {}", output_path.display());
            }
        }

        // On non-Windows hosts
        #[cfg(not(target_os = "windows"))]
        {
            eprintln!("Cannot extract Windows zip on non-Windows host");
        }
    }

    // Clean up temp files
    let _ = fs::remove_file(&temp_file);
}

// Helper function to recursively find a file by name
fn find_file(dir: &PathBuf, filename: &str) -> Option<PathBuf> {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.file_name().unwrap() == filename {
                return Some(path);
            } else if path.is_dir() {
                if let Some(found) = find_file(&path, filename) {
                    return Some(found);
                }
            }
        }
    }
    None
}
