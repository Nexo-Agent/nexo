import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TauriCommands } from '@/lib/tauri';
import { createBrowserSession, setBrowserViewerActive } from './browserApi';

vi.mock('@/lib/tauri', () => ({
  invokeCommand: vi.fn(),
  TauriCommands: {
    BROWSER_CREATE_SESSION: 'browser_create_session',
    BROWSER_SET_VIEWER_ACTIVE: 'browser_set_viewer_active',
  },
}));

describe('browserApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads session_id from create session response', async () => {
    const { invokeCommand } = await import('@/lib/tauri');
    vi.mocked(invokeCommand).mockResolvedValueOnce({ session_id: 'sess-1' });

    const result = await createBrowserSession({ url: 'https://example.com' });

    expect(result.session_id).toBe('sess-1');
    expect(invokeCommand).toHaveBeenCalledWith(
      TauriCommands.BROWSER_CREATE_SESSION,
      expect.objectContaining({ url: 'https://example.com' })
    );
  });

  it('passes camelCase args to set viewer active', async () => {
    const { invokeCommand } = await import('@/lib/tauri');
    vi.mocked(invokeCommand).mockResolvedValueOnce(undefined);

    await setBrowserViewerActive('sess-1', true);

    expect(invokeCommand).toHaveBeenCalledWith(
      TauriCommands.BROWSER_SET_VIEWER_ACTIVE,
      { sessionId: 'sess-1', active: true }
    );
  });
});
