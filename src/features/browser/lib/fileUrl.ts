import { invokeCommand, TauriCommands } from '@/lib/tauri';

/**
 * Convert an absolute filesystem path to a file:// URL for Chromium CDP navigation.
 * Delegates to Rust (`Url::from_file_path`) for cross-platform correctness.
 * Do not use convertFileSrc — that yields Tauri's asset protocol, which headless Chrome rejects.
 */
export async function absolutePathToFileUrl(
  absolutePath: string
): Promise<string> {
  return invokeCommand<string>(TauriCommands.PATH_TO_FILE_URL, {
    path: absolutePath.trim(),
  });
}
