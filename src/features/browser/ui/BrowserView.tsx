import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Plus, RotateCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/atoms/button/button';
import { Input } from '@/ui/atoms/input';
import { useBrowserNavigation } from '../hooks/useBrowserNavigation';
import { useBrowserSession } from '../hooks/useBrowserSession';
import { BrowserStreamSkeleton } from './BrowserStreamSkeleton';

const BrowserStreamView = lazy(() =>
  import('./BrowserStreamView').then((mod) => ({
    default: mod.BrowserStreamView,
  }))
);

interface BrowserTab {
  id: string;
  url: string;
  title: string;
}

export interface BrowserViewProps {
  chatId?: string;
  initialUrl?: string;
  autoStart?: boolean;
  /** Show tab bar and navigation toolbar. Set false for fence/embed. */
  showChrome?: boolean;
  className?: string;
  streamClassName?: string;
  width?: number;
  height?: number;
}

const DEFAULT_URL = 'https://example.com';

function tabTitleFromUrl(url: string, fallback: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname || fallback;
  } catch {
    return fallback;
  }
}

function createTab(url: string, fallbackTitle: string): BrowserTab {
  const id = crypto.randomUUID();
  return {
    id,
    url,
    title: tabTitleFromUrl(url, fallbackTitle),
  };
}

export function BrowserView({
  chatId,
  initialUrl = DEFAULT_URL,
  autoStart = false,
  showChrome = true,
  className,
  streamClassName,
  width,
  height,
}: BrowserViewProps) {
  const { t } = useTranslation('browser');
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [
    createTab(initialUrl, 'Tab'),
  ]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id ?? '');
  const [addressUrl, setAddressUrl] = useState(initialUrl);

  const syncChromeFromNav = useCallback(
    (state: { url: string; title: string }) => {
      if (!state.url) return;
      setAddressUrl(state.url);
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? {
                ...tab,
                url: state.url,
                title: state.title || tabTitleFromUrl(state.url, t('newTab')),
              }
            : tab
        )
      );
    },
    [activeTabId, t]
  );

  const {
    sessionId,
    loading: sessionLoading,
    error,
    createSession,
    navigate: navigateSession,
  } = useBrowserSession({
    chatId,
    url: initialUrl,
    width,
    height,
    autoStart,
  });

  const { navState, navigating, navigate, goBack, goForward, reload } =
    useBrowserNavigation(sessionId, syncChromeFromNav);

  const displayUrl = showChrome ? addressUrl : navState.url || initialUrl;

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    return createSession();
  }, [sessionId, createSession]);

  const handleNavigate = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      await ensureSession();
      await navigate(trimmed);
      setAddressUrl(trimmed);
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? {
                ...tab,
                url: trimmed,
                title: tabTitleFromUrl(trimmed, t('newTab')),
              }
            : tab
        )
      );
    },
    [ensureSession, navigate, activeTabId, t]
  );

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleNavigate(addressUrl).catch(() => undefined);
  };

  const handleSelectTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab) return;
      setActiveTabId(tabId);
      setAddressUrl(tab.url);
      await ensureSession();
      await navigateSession(tab.url);
    },
    [tabs, ensureSession, navigateSession]
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return;
      setTabs((prev) => {
        const next = prev.filter((tab) => tab.id !== tabId);
        if (tabId === activeTabId && next[0]) {
          setActiveTabId(next[0].id);
          setAddressUrl(next[0].url);
          ensureSession()
            .then(() => navigateSession(next[0].url))
            .catch(() => undefined);
        }
        return next;
      });
    },
    [tabs.length, activeTabId, ensureSession, navigateSession]
  );

  const handleNewTab = useCallback(() => {
    const tab = createTab(DEFAULT_URL, t('newTab'));
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setAddressUrl(tab.url);
    ensureSession()
      .then(() => navigate(tab.url))
      .catch(() => undefined);
  }, [ensureSession, navigate, t]);

  const stream = useMemo(() => {
    if (!sessionId) {
      return (
        <BrowserStreamSkeleton className={cn('min-h-64', streamClassName)} />
      );
    }
    return (
      <Suspense
        fallback={
          <BrowserStreamSkeleton className={cn('min-h-64', streamClassName)} />
        }
      >
        <BrowserStreamView
          sessionId={sessionId}
          className={cn('min-h-64 rounded-none border-0', streamClassName)}
        />
      </Suspense>
    );
  }, [sessionId, streamClassName]);

  if (!showChrome) {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-lg border bg-background',
          className
        )}
      >
        {error && (
          <p className="border-b px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        {stream}
      </div>
    );
  }

  const busy = sessionLoading || navigating;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-1 overflow-x-auto border-b bg-muted/40 px-2 py-1.5">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={cn(
                'group flex max-w-[180px] shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/70'
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => handleSelectTab(tab.id).catch(() => undefined)}
                title={tab.url}
              >
                {tab.title || tabTitleFromUrl(tab.url, t('newTab'))}
              </button>
              {tabs.length > 1 && (
                <button
                  type="button"
                  className="rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                  onClick={() => handleCloseTab(tab.id)}
                  aria-label={t('closeTab')}
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={handleNewTab}
          aria-label={t('newTab')}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <form
        className="flex items-center gap-1 border-b px-2 py-1.5"
        onSubmit={handleAddressSubmit}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          disabled={!navState.can_go_back || busy}
          onClick={() => goBack().catch(() => undefined)}
          aria-label={t('back')}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          disabled={!navState.can_go_forward || busy}
          onClick={() => goForward().catch(() => undefined)}
          aria-label={t('forward')}
        >
          <ArrowRight className="size-4" />
        </Button>
        <Input
          value={displayUrl}
          onChange={(e) => setAddressUrl(e.target.value)}
          className="h-8 flex-1 font-mono text-xs"
          placeholder={t('addressPlaceholder')}
          disabled={busy}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          disabled={!sessionId || busy}
          onClick={() => reload().catch(() => undefined)}
          aria-label={t('reload')}
        >
          <RotateCw className={cn('size-4', busy && 'animate-spin')} />
        </Button>
      </form>

      {error && (
        <p className="border-b px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="min-h-0 flex-1 bg-black">{stream}</div>
    </div>
  );
}
