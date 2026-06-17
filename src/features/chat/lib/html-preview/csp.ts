import { HTML_PREVIEW_CDN_WHITELIST } from './constants';
import { sanitizeHtmlPreview } from './sanitize';
import { buildScrollbarStyleTag } from './scrollbar-styles';

const CDN_SOURCES = HTML_PREVIEW_CDN_WHITELIST.map(
  (host) => `https://${host}`
).join(' ');

const CSP_POLICY = [
  "default-src 'none'",
  `script-src 'unsafe-inline' ${CDN_SOURCES}`,
  `style-src 'unsafe-inline' ${CDN_SOURCES}`,
  `img-src data: blob: ${CDN_SOURCES}`,
  `font-src ${CDN_SOURCES}`,
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const CSP_META_TAG = `<meta http-equiv="Content-Security-Policy" content="${CSP_POLICY}">`;

function buildHeadInjection(): string {
  return `${CSP_META_TAG}${buildScrollbarStyleTag()}`;
}

function injectHeadExtras(html: string): string {
  const injection = buildHeadInjection();

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
  }

  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${injection}</head>`);
  }

  return `<!DOCTYPE html><html><head>${injection}</head><body>${html}</body></html>`;
}

export function buildSandboxSrcdoc(html: string): string {
  const sanitized = sanitizeHtmlPreview(html);
  return injectHeadExtras(sanitized);
}
