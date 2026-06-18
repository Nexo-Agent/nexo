import { describe, expect, it } from 'vitest';
import type { BrowserTabSummary } from '../types';
import { findPanelTabByUrl, normalizeBrowserUrl } from './browserUrl';

describe('normalizeBrowserUrl', () => {
  it('normalizes file URLs with encoded path segments', () => {
    const a = 'file:///Users/test/hello%20world.html';
    const b = 'file:///Users/test/hello world.html';
    expect(normalizeBrowserUrl(a)).toBe(normalizeBrowserUrl(b));
  });

  it('strips hash from http URLs', () => {
    expect(normalizeBrowserUrl('https://example.com/page#section')).toBe(
      'https://example.com/page'
    );
  });
});

describe('findPanelTabByUrl', () => {
  const tabs: BrowserTabSummary[] = [
    {
      tab_id: '1',
      kind: 'panel',
      url: 'file:///tmp/artifact.html',
      title: 'Artifact',
    },
  ];

  it('finds tab by normalized file URL', () => {
    expect(findPanelTabByUrl(tabs, 'file:///tmp/artifact.html')).toEqual(
      tabs[0]
    );
    expect(
      findPanelTabByUrl(tabs, 'file:///tmp/artifact.html#section')
    ).toEqual(tabs[0]);
  });
});
