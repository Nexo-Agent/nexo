import { describe, expect, it } from 'vitest';
import { getLanguageLabel } from './constants';

describe('getLanguageLabel', () => {
  it('maps common aliases to readable labels', () => {
    expect(getLanguageLabel('js')).toBe('JavaScript');
    expect(getLanguageLabel('python')).toBe('Python');
    expect(getLanguageLabel('html')).toBe('HTML');
  });

  it('falls back to uppercase for unknown languages', () => {
    expect(getLanguageLabel('rust')).toBe('RUST');
  });

  it('returns Code for empty language', () => {
    expect(getLanguageLabel('')).toBe('Code');
  });
});
