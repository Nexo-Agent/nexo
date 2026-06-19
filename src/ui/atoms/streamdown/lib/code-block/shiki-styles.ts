import type { CSSProperties } from 'react';

function applyThemeChunk(
  style: Record<string, string>,
  chunk: string,
  defaultProperty: 'color' | 'backgroundColor'
) {
  const trimmed = chunk.trim();
  if (!trimmed) return;

  if (trimmed.startsWith('--')) {
    const separator = trimmed.indexOf(':');
    if (separator === -1) return;
    style[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
    return;
  }

  style[defaultProperty] = trimmed;
}

/** Parses Shiki dual-theme `fg` / `bg` strings into a React style object. */
export function parseShikiRootStyle(fg: string, bg: string): CSSProperties {
  const style: Record<string, string> = {};

  for (const chunk of fg.split(';')) {
    applyThemeChunk(style, chunk, 'color');
  }

  for (const chunk of bg.split(';')) {
    applyThemeChunk(style, chunk, 'backgroundColor');
  }

  return style;
}
