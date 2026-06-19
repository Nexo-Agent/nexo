import { describe, it, expect } from 'vitest';
import { toEpochMs } from './timestamps';

describe('usage timestamps', () => {
  it('keeps millisecond timestamps unchanged', () => {
    expect(toEpochMs(1_730_419_200_000)).toBe(1_730_419_200_000);
  });

  it('converts second-based timestamps to milliseconds', () => {
    expect(toEpochMs(1_730_419_200)).toBe(1_730_419_200_000);
  });
});
