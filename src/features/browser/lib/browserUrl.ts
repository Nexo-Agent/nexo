import type { BrowserTabSummary } from '../types';

/** Canonical form for comparing browser tab URLs (esp. file:// paths). */
export function normalizeBrowserUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'file:') {
      const path = decodeURIComponent(parsed.pathname);
      return `file://${path}`;
    }
    parsed.hash = '';
    return parsed.href;
  } catch {
    return trimmed;
  }
}

export function findPanelTabByUrl(
  tabs: BrowserTabSummary[],
  url: string
): BrowserTabSummary | undefined {
  const target = normalizeBrowserUrl(url);
  if (!target) return undefined;
  return tabs.find((tab) => normalizeBrowserUrl(tab.url) === target);
}
