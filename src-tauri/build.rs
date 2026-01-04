use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    tauri_build::build();

    println!("cargo:rerun-if-changed=build.rs");

    // Setup configurations
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let binaries_dir = manifest_dir.join("binaries");

    // Ensure binaries setup
    fs::create_dir_all(&binaries_dir).expect("Failed to create binaries directory");

    // Define Tools
    let uv = SidecarTool {
        name: "uv",
        version: "0.9.21",
        url_generator: get_uv_url,
    };

    let fnm = SidecarTool {
        name: "fnm",
        version: "1.35.1",
        url_generator: get_fnm_url,
    };

    // Install Tools
    uv.install(&out_dir, &binaries_dir);
    fnm.install(&out_dir, &binaries_dir);
}

// --- Tool Definitions ---

struct SidecarTool {
    name: &'static str,
    version: &'static str,
    url_generator: fn(&str, &str) -> Option<(String, String)>, // (url, binary_name_in_archive)
}

impl SidecarTool {
    fn install(&self, out_dir: &PathBuf, binaries_dir: &PathBuf) {
        let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
        let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();
        let target_triple = format!("{}-{}", target_os, target_arch); // Simplified identifier

        // Resolve URL and Binary Name
        let (url, _) = match (self.url_generator)(self.version, &target_os) {
            Some(u) => u,
            None => {
                println!(
                    "Skipping {} for unsupported platform: {} {}",
                    self.name, target_os, target_arch
                );
                return;
            }
        };

        // Determine final binary name (tauri sidecar convention is specific,
        // but here we use generic names as we are using 'resources' in tauri.conf.json)
        let binary_name = if target_os == "windows" {
            format!("{}.exe", self.name)
        } else {
            self.name.to_string()
        };

        let output_path = binaries_dir.join(&binary_name);

        if output_path.exists() {
            println!(
                "{} binary already exists at: {}",
                self.name,
                output_path.display()
            );
            return;
        }

        println!("Setting up {} version {}...", self.name, self.version);
        download_and_extract(
            self.name,
            &url,
            &binary_name,
            &target_triple,
            out_dir,
            &output_path,
        );
    }
}

// --- URL Generators ---

fn get_uv_url(version: &str, target_os: &str) -> Option<(String, String)> {
    let arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();

    match (target_os, arch.as_str()) {
        ("macos", "aarch64") => Some((
            format!("https://github.com/astral-sh/uv/releases/download/{}/uv-aarch64-apple-darwin.tar.gz", version),
            "uv".to_string()
        )),
        ("macos", "x86_64") => Some((
            format!("https://github.com/astral-sh/uv/releases/download/{}/uv-x86_64-apple-darwin.tar.gz", version),
            "uv".to_string()
        )),
        ("windows", _) => Some((
            format!("https://github.com/astral-sh/uv/releases/download/{}/uv-x86_64-pc-windows-msvc.zip", version),
            "uv.exe".to_string()
        )),
        ("linux", "x86_64") => Some((
            format!("https://github.com/astral-sh/uv/releases/download/{}/uv-x86_64-unknown-linux-gnu.tar.gz", version),
            "uv".to_string()
        )),
        _ => None,
    }
}

fn get_fnm_url(version: &str, target_os: &str) -> Option<(String, String)> {
    // FNM release names are simpler
    match target_os {
        "macos" => Some((
            format!(
                "https://github.com/Schniz/fnm/releases/download/v{}/fnm-macos.zip",
                version
            ),
            "fnm".to_string(),
        )),
        "windows" => Some((
            format!(
                "https://github.com/Schniz/fnm/releases/download/v{}/fnm-windows.zip",
                version
            ),
            "fnm.exe".to_string(),
        )),
        "linux" => Some((
            format!(
                "https://github.com/Schniz/fnm/releases/download/v{}/fnm-linux.zip",
                version
            ),
            "fnm".to_string(),
        )),
        _ => None,
    }
}

// --- Core Logic: Download & Extract ---

fn download_and_extract(
    tool_name: &str,
    url: &str,
    binary_name: &str,
    target_triple: &str,
    out_dir: &PathBuf,
    final_output_path: &PathBuf,
) {
    let temp_file = out_dir.join(format!("{}-{}.tmp", tool_name, target_triple));

    println!("Downloading {} from {}", tool_name, url);
    let status = Command::new("curl")
        .args(&["-L", "-o", temp_file.to_str().unwrap(), url])
        .status()
        .expect("Failed to execute curl");

    if !status.success() {
        panic!("Failed to download package for {}", tool_name);
    }

    let extract_dir = out_dir.join(format!("{}-extract-{}", tool_name, target_triple));
    fs::create_dir_all(&extract_dir).expect("Failed to create extract dir");

    let extracted = if url.ends_with(".tar.gz") {
        let s = Command::new("tar")
            .args(&[
                "xzf",
                temp_file.to_str().unwrap(),
                "-C",
                extract_dir.to_str().unwrap(),
            ])
            .status()
            .expect("Failed to run tar");
        s.success()
    } else if url.ends_with(".zip") {
        #[cfg(target_os = "windows")]
        {
            let s = Command::new("powershell")
                .args(&[
                    "-Command",
                    &format!(
                        "Expand-Archive -Path '{}' -DestinationPath '{}' -Force",
                        temp_file.display(),
                        extract_dir.display()
                    ),
                ])
                .status()
                .expect("Failed to run powershell");
            s.success()
        }
        #[cfg(not(target_os = "windows"))]
        {
            let s = Command::new("unzip")
                .args(&[
                    "-o",
                    temp_file.to_str().unwrap(),
                    "-d",
                    extract_dir.to_str().unwrap(),
                ])
                .status();
            match s {
                Ok(status) => status.success(),
                Err(_) => {
                    println!("Warning: 'unzip' not found. Ensure it is installed.");
                    false
                }
            }
        }
    } else {
        false
    };

    if extracted {
        if let Some(source_path) = find_file(&extract_dir, binary_name) {
            fs::copy(&source_path, final_output_path).expect("Failed to copy binary to final dest");

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(metadata) = fs::metadata(&final_output_path) {
                    let mut perms = metadata.permissions();
                    perms.set_mode(0o755);
                    let _ = fs::set_permissions(&final_output_path, perms);
                }
            }
            println!("Installed {} to {}", tool_name, final_output_path.display());
        } else {
            panic!(
                "Binary '{}' not found inside extracted archive",
                binary_name
            );
        }
    } else {
        panic!("Failed to extract archive for {}", tool_name);
    }
    let _ = fs::remove_file(&temp_file);
}

fn find_file(dir: &PathBuf, filename: &str) -> Option<PathBuf> {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.file_name()?.to_str()? == filename {
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
