import { useCallback, useEffect, useState } from 'react';
import { listenToEvent, TauriEvents } from '@/lib/tauri';
import {
  getBrowserNavigationState,
  goBrowserBack,
  goBrowserForward,
  navigateBrowserTab,
  reloadBrowserTab,
} from '../state/browserApi';
import type { BrowserNavigationState } from '../types';

const EMPTY_STATE: BrowserNavigationState = {
  url: '',
  title: '',
  can_go_back: false,
  can_go_forward: false,
};

export function useBrowserNavigation(
  tabId: string | null,
  onNavStateChange?: (state: BrowserNavigationState) => void
) {
  const [navState, setNavState] = useState<BrowserNavigationState>(EMPTY_STATE);
  const [navigating, setNavigating] = useState(false);

  const applyNavState = useCallback(
    (state: BrowserNavigationState) => {
      setNavState(state);
      onNavStateChange?.(state);
    },
    [onNavStateChange]
  );

  const refresh = useCallback(async () => {
    if (!tabId) return;
    try {
      const state = await getBrowserNavigationState(tabId);
      applyNavState(state);
    } catch {
      // Tab may not be ready yet.
    }
  }, [tabId, applyNavState]);

  useEffect(() => {
    if (!tabId) {
      applyNavState(EMPTY_STATE);
      return;
    }

    refresh().catch(() => undefined);

    let unlisten: (() => void) | undefined;
    listenToEvent<{ tab_id: string; url: string }>(
      TauriEvents.BROWSER_NAVIGATED,
      (payload) => {
        if (payload.tab_id !== tabId) return;
        refresh().catch(() => undefined);
      }
    ).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [tabId, refresh, applyNavState]);

  const navigate = useCallback(
    async (url: string) => {
      if (!tabId) return;
      setNavigating(true);
      try {
        await navigateBrowserTab(url, tabId);
        await refresh();
      } finally {
        setNavigating(false);
      }
    },
    [tabId, refresh]
  );

  const goBack = useCallback(async () => {
    if (!tabId || !navState.can_go_back) return;
    setNavigating(true);
    try {
      const state = await goBrowserBack(tabId);
      applyNavState(state);
    } finally {
      setNavigating(false);
    }
  }, [tabId, navState.can_go_back, applyNavState]);

  const goForward = useCallback(async () => {
    if (!tabId || !navState.can_go_forward) return;
    setNavigating(true);
    try {
      const state = await goBrowserForward(tabId);
      applyNavState(state);
    } finally {
      setNavigating(false);
    }
  }, [tabId, navState.can_go_forward, applyNavState]);

  const reload = useCallback(async () => {
    if (!tabId) return;
    setNavigating(true);
    try {
      await reloadBrowserTab(tabId);
      await refresh();
    } finally {
      setNavigating(false);
    }
  }, [tabId, refresh]);

  return {
    navState,
    navigating,
    navigate,
    goBack,
    goForward,
    reload,
    refresh,
  };
}
