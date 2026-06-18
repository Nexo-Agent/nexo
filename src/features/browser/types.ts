/** Rust event/command payloads use snake_case; invoke args use camelCase via browserApi. */
export interface BrowserFrameEvent {
  session_id: string;
  data: string;
  timestamp: number;
  viewport_width: number;
  viewport_height: number;
}

export interface BrowserSessionStartedEvent {
  session_id: string;
  chat_id?: string | null;
}

export interface BrowserSessionStoppedEvent {
  session_id: string;
}

export interface BrowserNavigationState {
  url: string;
  title: string;
  can_go_back: boolean;
  can_go_forward: boolean;
}

export interface BrowserNavigatedEvent {
  session_id: string;
  url: string;
}

export interface BrowserErrorEvent {
  session_id: string;
  error: string;
}

export interface BrowserRuntimeDownloadProgressEvent {
  percent?: number | null;
  bytes_downloaded: number;
  total_bytes?: number | null;
}

export interface BrowserRuntimeReadyEvent {
  version: string;
}

export interface BrowserRuntimeErrorEvent {
  error: string;
}

export type BrowserInputEvent =
  | {
      type: 'mousePressed';
      x: number;
      y: number;
      button: string;
      clickCount: number;
    }
  | {
      type: 'mouseReleased';
      x: number;
      y: number;
      button: string;
      clickCount: number;
    }
  | { type: 'mouseMoved'; x: number; y: number }
  | {
      type: 'mouseWheel';
      x: number;
      y: number;
      deltaX: number;
      deltaY: number;
    }
  | { type: 'keyDown'; key: string; code: string }
  | { type: 'keyUp'; key: string; code: string }
  | { type: 'insertText'; text: string };

export interface BrowserRuntimeStatus {
  installed: boolean;
  version?: string | null;
  downloading: boolean;
}

export interface CreateSessionResponse {
  session_id: string;
}
