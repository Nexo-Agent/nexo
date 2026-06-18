export type BrowserTabKind = 'panel' | 'fence';

export interface BrowserTabSummary {
  tab_id: string;
  kind: BrowserTabKind;
  url: string;
  title: string;
  anchor_id?: string | null;
  chat_id?: string | null;
}

export interface BrowserNavigationState {
  url: string;
  title: string;
  can_go_back: boolean;
  can_go_forward: boolean;
}

export interface BrowserNavigatedEvent {
  tab_id: string;
  url: string;
}

export interface BrowserTabCreatedEvent {
  tab_id: string;
  kind: BrowserTabKind;
  url?: string | null;
  anchor_id?: string | null;
  chat_id?: string | null;
}

export interface BrowserTabDestroyedEvent {
  tab_id: string;
}

export interface BrowserActiveTabChangedEvent {
  tab_id: string;
}

export interface BrowserTitleChangedEvent {
  tab_id: string;
  title: string;
}

export interface CreateTabResponse {
  tab_id: string;
}

export interface ListTabsResponse {
  tabs: BrowserTabSummary[];
}

export interface GetActiveTabResponse {
  tab_id: string | null;
}

export type BrowserViewport = 'main_panel' | 'fence';
