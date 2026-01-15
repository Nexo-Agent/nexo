import { describe, it, expect, vi } from 'vitest';
import { cn, formatFileSize, parseBackendError, throttle } from './utils';

describe('utils.ts', () => {
  describe('cn', () => {
    it('should merge classes correctly', () => {
      expect(cn('a', 'b')).toBe('a b');
      expect(cn('a', { b: true, c: false })).toBe('a b');
      expect(cn('px-2 py-2', 'px-4')).toBe('py-2 px-4'); // tailwind-merge in action
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
    });
  });

  describe('parseBackendError', () => {
    it('should parse categorized errors correctly', () => {
      const error = '[Network] Connection failed';
      const result = parseBackendError(error);
      expect(result.category).toBe('Network');
      expect(result.message).toBe('Connection failed');
    });

    it('should handle errors without category', () => {
      const error = 'Generic error';
      const result = parseBackendError(error);
      expect(result.category).toBeUndefined();
      expect(result.message).toBe('Generic error');
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      vi.useFakeTimers();
      const func = vi.fn();
      const throttled = throttle(func, 1000);

      throttled();
      throttled();
      throttled();

      expect(func).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      throttled();
      expect(func).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
