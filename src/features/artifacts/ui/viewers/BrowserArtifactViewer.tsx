import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useBrowserNavigation } from '@/features/browser/hooks/useBrowserNavigation';
import { useBrowserTabs } from '@/features/browser/hooks/useBrowserTabs';
import { notifyBrowserError } from '@/features/browser/lib/handleBrowserError';
import { BrowserStreamSkeleton } from '@/features/browser/ui/BrowserStreamSkeleton';
import type { Artifact } from '../../types';
import { ArtifactViewerHeader } from './ArtifactViewerHeader';

const BrowserWebviewHost = lazy(() =>
  import('@/features/browser/ui/BrowserWebviewHost').then((mod) => ({
    default: mod.BrowserWebviewHost,
  }))
);

interface BrowserArtifactViewerProps {
  artifact: Artifact;
  url: string;
}

export function BrowserArtifactViewer({
  artifact,
  url,
}: BrowserArtifactViewerProps) {
  const { activeTabId, openUrlInPanel } = useBrowserTabs();
  const { reload, navigating } = useBrowserNavigation(activeTabId);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const openingRef = useRef(false);

  useEffect(() => {
    if (openingRef.current) return;
    openingRef.current = true;

    openUrlInPanel(url)
      .catch((error) => {
        notifyBrowserError(error);
      })
      .finally(() => {
        openingRef.current = false;
        setLoadedUrl(url);
      });
  }, [url, openUrlInPanel]);

  const handleReload = () => {
    void reload().catch((error) => {
      notifyBrowserError(error);
    });
  };

  const showSkeleton = loadedUrl !== url || !activeTabId || navigating;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ArtifactViewerHeader
        artifact={artifact}
        onReload={handleReload}
        reloading={navigating}
      />
      <div className="relative min-h-0 flex-1 p-4">
        {showSkeleton ? (
          <BrowserStreamSkeleton className="h-full min-h-[320px]" />
        ) : (
          <Suspense
            fallback={
              <BrowserStreamSkeleton className="h-full min-h-[320px]" />
            }
          >
            <BrowserWebviewHost
              tabId={activeTabId}
              contentUrl={url}
              className="h-full min-h-[320px]"
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
