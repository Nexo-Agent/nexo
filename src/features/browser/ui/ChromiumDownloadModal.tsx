import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog';
import { listenToEvent, TauriEvents } from '@/lib/tauri';
import type {
  BrowserRuntimeDownloadProgressEvent,
  BrowserRuntimeErrorEvent,
  BrowserRuntimeReadyEvent,
} from '../types';

export function ChromiumDownloadModal() {
  const { t } = useTranslation('browser');
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unlistenProgress: (() => void) | undefined;
    let unlistenReady: (() => void) | undefined;
    let unlistenError: (() => void) | undefined;

    listenToEvent<BrowserRuntimeDownloadProgressEvent>(
      TauriEvents.BROWSER_RUNTIME_DOWNLOAD_PROGRESS,
      (payload) => {
        setOpen(true);
        setError(null);
        setPercent(payload.percent ?? 0);
      }
    ).then((fn) => {
      unlistenProgress = fn;
    });

    listenToEvent<BrowserRuntimeReadyEvent>(
      TauriEvents.BROWSER_RUNTIME_READY,
      () => {
        setPercent(100);
        setTimeout(() => setOpen(false), 600);
      }
    ).then((fn) => {
      unlistenReady = fn;
    });

    listenToEvent<BrowserRuntimeErrorEvent>(
      TauriEvents.BROWSER_RUNTIME_ERROR,
      (payload) => {
        setOpen(true);
        setError(payload.error);
      }
    ).then((fn) => {
      unlistenError = fn;
    });

    return () => {
      unlistenProgress?.();
      unlistenReady?.();
      unlistenError?.();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('downloadTitle')}</DialogTitle>
          <DialogDescription>{t('downloadDescription')}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
