import { invokeCommand, TauriCommands } from '@/lib/tauri';
import type {
  BrowserNavigationState,
  BrowserTabSummary,
  BrowserViewport,
  CreateTabResponse,
  GetActiveTabResponse,
  ListTabsResponse,
} from '../types';

export async function createBrowserTab(args: {
  url?: string | null;
}): Promise<CreateTabResponse> {
  return invokeCommand<CreateTabResponse>(
    TauriCommands.BROWSER_CREATE_TAB,
    args
  );
}

export async function destroyBrowserTab(tabId: string): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_DESTROY_TAB, { tabId });
}

export async function listBrowserTabs(): Promise<BrowserTabSummary[]> {
  const response = await invokeCommand<ListTabsResponse>(
    TauriCommands.BROWSER_LIST_TABS
  );
  return response.tabs;
}

export async function getActiveBrowserTab(): Promise<string | null> {
  const response = await invokeCommand<GetActiveTabResponse>(
    TauriCommands.BROWSER_GET_ACTIVE_TAB
  );
  return response.tab_id;
}

export async function setActiveBrowserTab(tabId: string): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_SET_ACTIVE_TAB, { tabId });
}

export async function createFenceBrowserTab(args: {
  anchorId: string;
  chatId?: string | null;
  url: string;
}): Promise<CreateTabResponse> {
  return invokeCommand<CreateTabResponse>(
    TauriCommands.BROWSER_CREATE_FENCE_TAB,
    args
  );
}

export async function releaseFenceBrowserTab(anchorId: string): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_RELEASE_FENCE_TAB, { anchorId });
}

export async function releaseFencesForChat(chatId: string): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_RELEASE_FENCES_FOR_CHAT, {
    chatId,
  });
}

export async function syncBrowserBounds(
  tabId: string,
  viewport: BrowserViewport,
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  },
  anchorId?: string
): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_SYNC_BOUNDS, {
    tabId,
    viewport,
    anchorId: anchorId ?? null,
    ...bounds,
  });
}

export async function releaseBrowserViewport(
  viewport: BrowserViewport,
  anchorId?: string
): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_RELEASE_VIEWPORT, {
    viewport,
    anchorId: anchorId ?? null,
  });
}

export async function navigateBrowserTab(
  url: string,
  tabId?: string | null
): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_NAVIGATE, {
    tabId: tabId ?? null,
    url,
  });
}

export async function getBrowserNavigationState(
  tabId?: string | null
): Promise<BrowserNavigationState> {
  return invokeCommand<BrowserNavigationState>(
    TauriCommands.BROWSER_GET_NAVIGATION_STATE,
    { tabId: tabId ?? null }
  );
}

export async function goBrowserBack(
  tabId?: string | null
): Promise<BrowserNavigationState> {
  return invokeCommand<BrowserNavigationState>(TauriCommands.BROWSER_GO_BACK, {
    tabId: tabId ?? null,
  });
}

export async function goBrowserForward(
  tabId?: string | null
): Promise<BrowserNavigationState> {
  return invokeCommand<BrowserNavigationState>(
    TauriCommands.BROWSER_GO_FORWARD,
    { tabId: tabId ?? null }
  );
}

export async function reloadBrowserTab(tabId?: string | null): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_RELOAD, {
    tabId: tabId ?? null,
  });
}
