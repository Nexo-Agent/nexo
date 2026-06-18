import { useEffect, useState } from 'react';
import {
  createFenceBrowserTab,
  releaseFenceBrowserTab,
} from '../state/browserApi';

export function useBrowserFence(
  anchorId: string,
  chatId: string | undefined,
  url: string
) {
  const [tabId, setTabId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    createFenceBrowserTab({
      anchorId,
      chatId: chatId ?? null,
      url,
    })
      .then((result) => {
        if (cancelled) return;
        setError(null);
        setTabId(result.tab_id);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
      releaseFenceBrowserTab(anchorId).catch(() => undefined);
      setTabId(null);
    };
  }, [anchorId, chatId, url]);

  return { tabId, error };
}
