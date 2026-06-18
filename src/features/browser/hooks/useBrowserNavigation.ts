import { useCallback, useEffect, useState } from 'react';
import { listenToEvent, TauriEvents } from '@/lib/tauri';
import {
  getBrowserNavigationState,
  goBrowserBack,
  goBrowserForward,
  navigateBrowserSession,
} from '../state/browserApi';
import type { BrowserNavigationState } from '../types';

const EMPTY_STATE: BrowserNavigationState = {
  url: '',
  title: '',
  can_go_back: false,
  can_go_forward: false,
};

export function useBrowserNavigation(
  sessionId: string | null,
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
    if (!sessionId) return;
    try {
      const state = await getBrowserNavigationState(sessionId);
      applyNavState(state);
    } catch {
      // Session may not be ready yet.
    }
  }, [sessionId, applyNavState]);

  useEffect(() => {
    if (!sessionId) {
      applyNavState(EMPTY_STATE);
      return;
    }

    refresh().catch(() => undefined);

    let unlisten: (() => void) | undefined;
    listenToEvent<{ session_id: string; url: string }>(
      TauriEvents.BROWSER_NAVIGATED,
      (payload) => {
        if (payload.session_id !== sessionId) return;
        refresh().catch(() => undefined);
      }
    ).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [sessionId, refresh, applyNavState]);

  const navigate = useCallback(
    async (url: string) => {
      if (!sessionId) return;
      setNavigating(true);
      try {
        await navigateBrowserSession(sessionId, url);
        await refresh();
      } finally {
        setNavigating(false);
      }
    },
    [sessionId, refresh]
  );

  const goBack = useCallback(async () => {
    if (!sessionId || !navState.can_go_back) return;
    setNavigating(true);
    try {
      const state = await goBrowserBack(sessionId);
      applyNavState(state);
    } finally {
      setNavigating(false);
    }
  }, [sessionId, navState.can_go_back, applyNavState]);

  const goForward = useCallback(async () => {
    if (!sessionId || !navState.can_go_forward) return;
    setNavigating(true);
    try {
      const state = await goBrowserForward(sessionId);
      applyNavState(state);
    } finally {
      setNavigating(false);
    }
  }, [sessionId, navState.can_go_forward, applyNavState]);

  const reload = useCallback(async () => {
    if (!sessionId || !navState.url) return;
    await navigate(navState.url);
  }, [sessionId, navState.url, navigate]);

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
