/**
 * Convert an absolute filesystem path to a file:// URL for Chromium CDP navigation.
 * Do not use convertFileSrc — that yields Tauri's asset protocol, which headless Chrome rejects.
 */
export function absolutePathToFileUrl(absolutePath: string): string {
  const trimmed = absolutePath.trim();
  if (trimmed.toLowerCase().startsWith('file://')) {
    return trimmed;
  }

  let posix = trimmed.replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(posix)) {
    posix = `/${posix}`;
  }

  const encoded = posix
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `file://${encoded}`;
}

/** Extensions previewable in the embedded Chromium browser. */
export const BROWSER_PREVIEW_EXTENSIONS = new Set(['html', 'htm', 'pdf']);

export function isBrowserPreviewableFilename(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return BROWSER_PREVIEW_EXTENSIONS.has(ext);
}
