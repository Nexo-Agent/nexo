import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAppSelector } from '@/app/hooks';
import { listenToEvent, TauriEvents } from '@/lib/tauri';
import type {
  BrowserActiveTabChangedEvent,
  BrowserNavigatedEvent,
  BrowserTabCreatedEvent,
  BrowserTabDestroyedEvent,
  BrowserTabSummary,
  BrowserTitleChangedEvent,
} from '../types';
import {
  createBrowserTab,
  destroyBrowserTab,
  getActiveBrowserTab,
  listBrowserTabs,
  navigateBrowserTab,
  releaseFencesForChat,
  setActiveBrowserTab,
} from './browserApi';
import { notifyBrowserError } from '../lib/handleBrowserError';

interface BrowserContextValue {
  panelTabs: BrowserTabSummary[];
  activeTabId: string | null;
  loading: boolean;
  refreshTabs: () => Promise<void>;
  createTab: (url?: string) => Promise<string>;
  destroyTab: (tabId: string) => Promise<void>;
  setActiveTab: (tabId: string) => Promise<void>;
  navigateToUrl: (url: string) => Promise<void>;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

export function BrowserProvider({ children }: { children: ReactNode }) {
  const [panelTabs, setPanelTabs] = useState<BrowserTabSummary[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);
  const prevChatIdRef = useRef<string | null>(null);

  const refreshTabs = useCallback(async () => {
    const [tabs, active] = await Promise.all([
      listBrowserTabs(),
      getActiveBrowserTab(),
    ]);
    setPanelTabs(tabs);
    setActiveTabId(active);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listBrowserTabs(), getActiveBrowserTab()])
      .then(([tabs, active]) => {
        if (cancelled) return;
        setPanelTabs(tabs);
        setActiveTabId(active);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    const subscribe = async <T,>(
      event: (typeof TauriEvents)[keyof typeof TauriEvents],
      handler: (payload: T) => void
    ) => {
      const unlisten = await listenToEvent<T>(event, handler);
      unsubs.push(unlisten);
    };

    subscribe<BrowserTabCreatedEvent>(
      TauriEvents.BROWSER_TAB_CREATED,
      (payload) => {
        if (payload.kind !== 'panel') return;
        refreshTabs().catch(() => undefined);
      }
    );
    subscribe<BrowserTabDestroyedEvent>(
      TauriEvents.BROWSER_TAB_DESTROYED,
      () => {
        refreshTabs().catch(() => undefined);
      }
    );
    subscribe<BrowserActiveTabChangedEvent>(
      TauriEvents.BROWSER_ACTIVE_TAB_CHANGED,
      (payload) => {
        setActiveTabId(payload.tab_id);
      }
    );
    subscribe<BrowserNavigatedEvent>(
      TauriEvents.BROWSER_NAVIGATED,
      (payload) => {
        setPanelTabs((prev) =>
          prev.map((tab) =>
            tab.tab_id === payload.tab_id ? { ...tab, url: payload.url } : tab
          )
        );
      }
    );
    subscribe<BrowserTitleChangedEvent>(
      TauriEvents.BROWSER_TITLE_CHANGED,
      (payload) => {
        setPanelTabs((prev) =>
          prev.map((tab) =>
            tab.tab_id === payload.tab_id
              ? { ...tab, title: payload.title }
              : tab
          )
        );
      }
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [refreshTabs]);

  useEffect(() => {
    const prev = prevChatIdRef.current;
    if (prev && prev !== selectedChatId) {
      releaseFencesForChat(prev).catch(() => undefined);
    }
    prevChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const createTab = useCallback(
    async (url?: string) => {
      const result = await createBrowserTab({ url: url ?? null });
      await refreshTabs();
      return result.tab_id;
    },
    [refreshTabs]
  );

  const destroyTab = useCallback(
    async (tabId: string) => {
      await destroyBrowserTab(tabId);
      await refreshTabs();
    },
    [refreshTabs]
  );

  const setActiveTab = useCallback(async (tabId: string) => {
    try {
      await setActiveBrowserTab(tabId);
      setActiveTabId(tabId);
    } catch (error) {
      notifyBrowserError(error);
      throw error;
    }
  }, []);

  const navigateToUrl = useCallback(
    async (url: string) => {
      try {
        if (activeTabId) {
          await navigateBrowserTab(url, activeTabId);
        } else {
          const tabId = await createTab(url);
          await setActiveTab(tabId);
        }
        await refreshTabs();
      } catch (error) {
        notifyBrowserError(error);
        throw error;
      }
    },
    [activeTabId, createTab, refreshTabs, setActiveTab]
  );

  const value = useMemo(
    () => ({
      panelTabs,
      activeTabId,
      loading,
      refreshTabs,
      createTab,
      destroyTab,
      setActiveTab,
      navigateToUrl,
    }),
    [
      panelTabs,
      activeTabId,
      loading,
      refreshTabs,
      createTab,
      destroyTab,
      setActiveTab,
      navigateToUrl,
    ]
  );

  return (
    <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>
  );
}

export function useBrowserTabs() {
  const ctx = useContext(BrowserContext);
  if (!ctx) {
    throw new Error('useBrowserTabs must be used within BrowserProvider');
  }
  return ctx;
}
