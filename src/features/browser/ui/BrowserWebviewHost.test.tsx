import { describe, expect, it } from 'vitest';
import { resolveWebviewVisible } from './BrowserWebviewHost';

describe('BrowserWebviewHost visibility', () => {
  it('requires browser tab and open panel for main_panel viewport', () => {
    expect(resolveWebviewVisible('main_panel', true, true, 'browser')).toBe(
      true
    );
    expect(resolveWebviewVisible('main_panel', true, false, 'browser')).toBe(
      false
    );
    expect(resolveWebviewVisible('main_panel', true, true, 'artifacts')).toBe(
      false
    );
  });

  it('requires non-zero geometry', () => {
    expect(resolveWebviewVisible('main_panel', false, true, 'browser')).toBe(
      false
    );
  });

  it('allows fence viewport when geometry is visible', () => {
    expect(resolveWebviewVisible('fence', true, false, 'artifacts')).toBe(true);
  });
});
