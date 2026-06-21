import { describe, expect, it } from 'vitest';
import { parseShikiRootStyle } from './shiki-styles';

describe('parseShikiRootStyle', () => {
 it('parses dual-theme fg and bg strings from Shiki', () => {
 expect(
 parseShikiRootStyle(
 '#24292e;--shiki-dark:#e1e4e8',
 '#fff;--shiki-dark-bg:#24292e'
 )
 ).toEqual({
 color: '#24292e',
 '--shiki-dark': '#e1e4e8',
 backgroundColor: '#fff',
 '--shiki-dark-bg': '#24292e',
 });
 });
});
