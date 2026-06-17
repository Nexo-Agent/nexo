/** Maximum allowed size for HTML preview block content (bytes). */
export const MAX_HTML_PREVIEW_SIZE = 100 * 1024;

/** Default iframe height in pixels. */
export const DEFAULT_HTML_PREVIEW_HEIGHT = 400;

/** iframe sandbox — allow-scripts only; no allow-same-origin. */
export const HTML_PREVIEW_SANDBOX = 'allow-scripts';

/** CDN hosts allowed for external script/style loads inside previews. */
export const HTML_PREVIEW_CDN_WHITELIST = ['cdn.jsdelivr.net'] as const;

/** Markdown fence language for interactive HTML previews. */
export const HTML_PREVIEW_FENCE_LANGUAGE = 'html';
