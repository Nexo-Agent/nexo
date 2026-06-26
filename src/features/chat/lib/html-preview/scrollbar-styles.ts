/** Fallback colors when DOM is unavailable (SSR/tests). */
const FALLBACK_SCROLLBAR = {
  thumb: '#dadde5',
  thumbHover: '#9ca3af',
} as const;

function resolveScrollbarColors(): { thumb: string; thumbHover: string } {
  if (typeof document === 'undefined') {
    return FALLBACK_SCROLLBAR;
  }

  const styles = getComputedStyle(document.documentElement);
  const thumb =
    styles.getPropertyValue('--border').trim() || FALLBACK_SCROLLBAR.thumb;
  const thumbHover =
    styles.getPropertyValue('--muted-foreground').trim() ||
    FALLBACK_SCROLLBAR.thumbHover;

  return { thumb, thumbHover };
}

/**
 * Inline scrollbar styles matching the Cogito Studio chat ScrollArea.
 * Injected into sandboxed HTML previews because iframe scrollbars cannot be styled from the parent.
 */
export function buildScrollbarStyleTag(): string {
  const { thumb, thumbHover } = resolveScrollbarColors();

  const rules = `
html {
 scrollbar-width: thin;
 scrollbar-color: ${thumb} transparent;
}
* {
 scrollbar-width: thin;
 scrollbar-color: ${thumb} transparent;
}
*::-webkit-scrollbar {
 width: 6px;
 height: 6px;
}
*::-webkit-scrollbar-track {
 background: transparent;
}
*::-webkit-scrollbar-thumb {
 background-color: ${thumb};
 border-radius: 9999px;
 border: 1px solid transparent;
 background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover {
 background-color: ${thumbHover};
}
*::-webkit-scrollbar-corner {
 background: transparent;
}`.trim();

  return `<style data-cogito-studio="scrollbar">${rules}</style>`;
}
