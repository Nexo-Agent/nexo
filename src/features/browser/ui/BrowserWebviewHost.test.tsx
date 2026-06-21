import { describe, expect, it } from 'vitest';
import { resolveWebviewVisible } from './BrowserWebviewHost';

describe('BrowserWebviewHost visibility', () => {
  it('requires viewer tab and open panel for main_panel viewport', () => {
    expect(resolveWebviewVisible('main_panel', true, true, 'viewer')).toBe(
      true
    );
    expect(resolveWebviewVisible('main_panel', true, false, 'viewer')).toBe(
      false
    );
    expect(resolveWebviewVisible('main_panel', true, true, 'artifacts')).toBe(
      false
    );
  });

  it('requires non-zero geometry', () => {
    expect(resolveWebviewVisible('main_panel', false, true, 'viewer')).toBe(
      false
    );
  });

  it('allows fence viewport when geometry is visible', () => {
    expect(resolveWebviewVisible('fence', true, false, 'artifacts')).toBe(true);
  });
});
