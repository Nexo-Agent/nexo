import { describe, expect, it } from 'vitest';
import { absolutePathToFileUrl } from './fileUrl';

describe('absolutePathToFileUrl', () => {
  it('converts unix absolute paths', () => {
    expect(absolutePathToFileUrl('/Users/me/artifacts/chart.html')).toBe(
      'file:///Users/me/artifacts/chart.html'
    );
  });

  it('encodes spaces', () => {
    expect(absolutePathToFileUrl('/Users/me/my chart.html')).toBe(
      'file:///Users/me/my%20chart.html'
    );
  });

  it('passes through existing file URLs', () => {
    const url = 'file:///Users/me/chart.html';
    expect(absolutePathToFileUrl(url)).toBe(url);
  });

  it('converts windows paths', () => {
    expect(absolutePathToFileUrl('C:\\Users\\me\\chart.html')).toBe(
      'file:///C%3A/Users/me/chart.html'
    );
  });
});
