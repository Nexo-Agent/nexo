import { invokeCommand, TauriCommands } from '@/lib/tauri';
import type {
  BrowserInputEvent,
  BrowserNavigationState,
  CreateSessionResponse,
} from '../types';

export async function createBrowserSession(args: {
  chatId?: string;
  url?: string | null;
  width?: number;
  height?: number;
}): Promise<CreateSessionResponse> {
  return invokeCommand<CreateSessionResponse>(
    TauriCommands.BROWSER_CREATE_SESSION,
    args
  );
}

export async function setBrowserViewerActive(
  sessionId: string,
  active: boolean
): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_SET_VIEWER_ACTIVE, {
    sessionId,
    active,
  });
}

export async function destroyBrowserSession(sessionId: string): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_DESTROY_SESSION, { sessionId });
}

export async function navigateBrowserSession(
  sessionId: string,
  url: string
): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_NAVIGATE, { sessionId, url });
}

export async function sendBrowserInput(
  sessionId: string,
  event: BrowserInputEvent
): Promise<void> {
  return invokeCommand(TauriCommands.BROWSER_SEND_INPUT, { sessionId, event });
}

export async function getBrowserNavigationState(
  sessionId: string
): Promise<BrowserNavigationState> {
  return invokeCommand<BrowserNavigationState>(
    TauriCommands.BROWSER_GET_NAVIGATION_STATE,
    { sessionId }
  );
}

export async function goBrowserBack(
  sessionId: string
): Promise<BrowserNavigationState> {
  return invokeCommand<BrowserNavigationState>(TauriCommands.BROWSER_GO_BACK, {
    sessionId,
  });
}

export async function goBrowserForward(
  sessionId: string
): Promise<BrowserNavigationState> {
  return invokeCommand<BrowserNavigationState>(
    TauriCommands.BROWSER_GO_FORWARD,
    {
      sessionId,
    }
  );
}
