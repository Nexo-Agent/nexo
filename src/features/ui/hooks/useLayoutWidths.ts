import { useCallback, useSyncExternalStore } from 'react';

export const SIDEBAR_WIDTH_KEY = 'sidebarWidth';
export const RIGHT_PANEL_WIDTH_KEY = 'rightAreaWidth';
export const DEFAULT_SIDEBAR_WIDTH = 240;
export const SETTINGS_SIDEBAR_WIDTH = 256;
export const DEFAULT_RIGHT_PANEL_WIDTH = 400;

const SIDEBAR_WIDTH_EVENT = 'nexo:sidebar-width';
const RIGHT_PANEL_WIDTH_EVENT = 'nexo:right-panel-width';

function readSidebarWidth(): number {
  const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
  return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
}

function readRightPanelWidth(): number {
  const saved = localStorage.getItem(RIGHT_PANEL_WIDTH_KEY);
  const width = saved ? parseInt(saved, 10) : DEFAULT_RIGHT_PANEL_WIDTH;
  const maxWidth = window.innerWidth / 2;
  return Math.min(width, maxWidth);
}

function subscribeSidebarWidth(onStoreChange: () => void) {
  window.addEventListener(SIDEBAR_WIDTH_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(SIDEBAR_WIDTH_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function subscribeRightPanelWidth(onStoreChange: () => void) {
  window.addEventListener(RIGHT_PANEL_WIDTH_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  window.addEventListener('resize', onStoreChange);
  return () => {
    window.removeEventListener(RIGHT_PANEL_WIDTH_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener('resize', onStoreChange);
  };
}

export function notifySidebarWidthChange() {
  window.dispatchEvent(new Event(SIDEBAR_WIDTH_EVENT));
}

export function notifyRightPanelWidthChange() {
  window.dispatchEvent(new Event(RIGHT_PANEL_WIDTH_EVENT));
}

export function useSidebarWidth() {
  return useSyncExternalStore(
    subscribeSidebarWidth,
    readSidebarWidth,
    () => DEFAULT_SIDEBAR_WIDTH
  );
}

export function useRightPanelWidth() {
  return useSyncExternalStore(
    subscribeRightPanelWidth,
    readRightPanelWidth,
    () => DEFAULT_RIGHT_PANEL_WIDTH
  );
}

export function usePersistSidebarWidth() {
  const setSidebarWidth = useCallback((width: number) => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, width.toString());
    notifySidebarWidthChange();
  }, []);

  return setSidebarWidth;
}

export function usePersistRightPanelWidth() {
  const setRightPanelWidth = useCallback((width: number) => {
    localStorage.setItem(RIGHT_PANEL_WIDTH_KEY, width.toString());
    notifyRightPanelWidthChange();
  }, []);

  return setRightPanelWidth;
}
