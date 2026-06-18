import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  createBrowserTab,
  listBrowserTabs,
  syncBrowserBounds,
} from './browserApi';
import { TauriCommands } from '@/lib/tauri';
import { invokeCommand } from '@/lib/tauri';

vi.mock('@/lib/tauri', () => ({
  invokeCommand: vi.fn(),
  TauriCommands: {
    BROWSER_CREATE_TAB: 'browser_create_tab',
    BROWSER_SYNC_BOUNDS: 'browser_sync_bounds',
    BROWSER_LIST_TABS: 'browser_list_tabs',
  },
}));

describe('browserApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads tab_id from create tab response', async () => {
    vi.mocked(invokeCommand).mockResolvedValueOnce({ tab_id: 'tab-1' });

    const result = await createBrowserTab({ url: 'https://example.com' });

    expect(result.tab_id).toBe('tab-1');
    expect(invokeCommand).toHaveBeenCalledWith(
      TauriCommands.BROWSER_CREATE_TAB,
      { url: 'https://example.com' }
    );
  });

  it('syncs bounds with viewport and tab id', async () => {
    vi.mocked(invokeCommand).mockResolvedValueOnce(undefined);

    await syncBrowserBounds('tab-1', 'main_panel', {
      x: 1,
      y: 2,
      width: 100,
      height: 200,
      visible: true,
    });

    expect(invokeCommand).toHaveBeenCalledWith(
      TauriCommands.BROWSER_SYNC_BOUNDS,
      expect.objectContaining({
        tabId: 'tab-1',
        viewport: 'main_panel',
        x: 1,
        y: 2,
        width: 100,
        height: 200,
        visible: true,
      })
    );
  });

  it('lists panel tabs', async () => {
    vi.mocked(invokeCommand).mockResolvedValueOnce({
      tabs: [{ tab_id: 'tab-1', kind: 'panel', url: '', title: '' }],
    });

    const tabs = await listBrowserTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.tab_id).toBe('tab-1');
  });
});
