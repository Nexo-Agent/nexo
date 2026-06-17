import { HTML_PREVIEW_CDN_WHITELIST, MAX_HTML_PREVIEW_SIZE } from './constants';

export class HtmlPreviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HtmlPreviewValidationError';
  }
}

function isWhitelistedUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://cdn.jsdelivr.net');
    return HTML_PREVIEW_CDN_WHITELIST.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

function stripDisallowedExternalResources(html: string): string {
  let result = html;

  // Prevent base tag hijacking relative URLs
  result = result.replace(/<base\b[^>]*>/gi, '');

  result = result.replace(/<script\b[^>]*>/gi, (match) => {
    const srcMatch = match.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) {
      return match;
    }
    if (isWhitelistedUrl(srcMatch[1])) {
      return match;
    }
    return `<!-- blocked script: ${srcMatch[1]} -->`;
  });

  result = result.replace(/<link\b[^>]*>/gi, (match) => {
    if (!/\brel=["']stylesheet["']/i.test(match)) {
      return match;
    }
    const hrefMatch = match.match(/\bhref=["']([^"']+)["']/i);
    if (!hrefMatch) {
      return match;
    }
    if (isWhitelistedUrl(hrefMatch[1])) {
      return match;
    }
    return `<!-- blocked stylesheet: ${hrefMatch[1]} -->`;
  });

  return result;
}

export function sanitizeHtmlPreview(html: string): string {
  const trimmed = html.trim();

  if (!trimmed) {
    throw new HtmlPreviewValidationError('HTML preview content is empty');
  }

  if (new TextEncoder().encode(trimmed).length > MAX_HTML_PREVIEW_SIZE) {
    throw new HtmlPreviewValidationError(
      `HTML preview exceeds maximum size of ${MAX_HTML_PREVIEW_SIZE} bytes`
    );
  }

  return stripDisallowedExternalResources(trimmed);
}

export function isCompleteHtmlDocument(html: string): boolean {
  return /<\/html\s*>/i.test(html) || /<\/body\s*>/i.test(html);
}
