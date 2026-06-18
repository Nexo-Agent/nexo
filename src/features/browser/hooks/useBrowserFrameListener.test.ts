import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBrowserFrameListener } from './useBrowserFrameListener';

vi.mock('@/lib/tauri', () => ({
  listenToEvent: vi.fn(() => Promise.resolve(() => undefined)),
  TauriEvents: { BROWSER_FRAME: 'browser-frame' },
}));

describe('useBrowserFrameListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a single listener per session', async () => {
    const { listenToEvent } = await import('@/lib/tauri');
    const handler = vi.fn();

    renderHook(() => useBrowserFrameListener('session-1', handler));
    renderHook(() => useBrowserFrameListener('session-1', handler));

    expect(listenToEvent).toHaveBeenCalledTimes(1);
  });
});
