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

/** Extensions previewable in the embedded Chromium browser. */
export const BROWSER_PREVIEW_EXTENSIONS = new Set(['html', 'htm', 'pdf']);

export function isBrowserPreviewableFilename(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return BROWSER_PREVIEW_EXTENSIONS.has(ext);
}
