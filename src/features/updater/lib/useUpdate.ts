import { useState, useCallback } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'downloading'
  | 'installing'
  | 'ready-to-restart'
  | 'error';

export function useUpdate() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [update, setUpdate] = useState<Update | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const checkUpdate = useCallback(async (silent = false) => {
    try {
      setStatus('checking');
      setError(null);

      const newUpdate = await check();

      if (newUpdate?.available) {
        setUpdate(newUpdate);
        setStatus('available');
        if (!silent) {
          toast.info(`New version ${newUpdate.version} is available!`);
        }
      } else {
        setUpdate(null);
        setStatus('up-to-date');
        if (!silent) {
          toast.success('You have the latest version.');
        }
      }
    } catch (err) {
      logger.error('Failed to check for updates:', err);
      // Only show error if not silent or if it's a critical failure during manual check
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
        toast.error('Failed to check for updates');
      } else {
        setStatus('idle');
      }
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!update) return;

    try {
      setStatus('downloading');
      setDownloadProgress(0);

      let contentLength: number | undefined;
      let downloaded = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength) {
              setDownloadProgress((downloaded / contentLength) * 100);
            }
            break;
          case 'Finished':
            setStatus('installing');
            break;
        }
      });

      setStatus('ready-to-restart');
      toast.success('Update installed! Restarting...');
      await relaunch();
    } catch (err) {
      logger.error('Failed to install update:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
      toast.error(
        `Failed to install update: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }, [update]);

  return {
    status,
    update,
    error,
    downloadProgress,
    checkUpdate,
    installUpdate,
  };
}
