import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info as InfoIcon,
} from 'lucide-react';
import { useUpdate } from '../lib/useUpdate';
import { cn } from '@/lib/utils';
import { getVersion } from '@tauri-apps/api/app';

export function UpdateSection() {
  const { t } = useTranslation(['common', 'settings']);
  const { status, update, error, checkUpdate, installUpdate } = useUpdate();
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    getVersion().then(setCurrentVersion);
  }, []);

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return t('checkingForUpdates', 'Checking for updates...');
      case 'available':
        return t('newVersionAvailable', {
          version: update?.version,
          defaultValue: `New version ${update?.version} available`,
        });
      case 'up-to-date':
        return t('upToDate', 'You have the latest version');
      case 'downloading':
        return t('downloadingUpdate', 'Downloading update...');
      case 'installing':
        return t('installingUpdate', 'Installing update...');
      case 'ready-to-restart':
        return t('updateReady', 'Update ready. Restarting...');
      case 'error':
        return error || t('updateError', 'Failed to check for updates');
      default:
        return t('checkForUpdates', 'Check for updates');
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw
              className={cn('size-4', status === 'checking' && 'animate-spin')}
            />
            {t('softwareUpdate', 'Software Update')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('currentVersion', 'Current version')}: {currentVersion || '...'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === 'available' ? (
            <button
              onClick={installUpdate}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            >
              <Download className="mr-2 size-4" />
              {t('updateNow', 'Update Now')}
            </button>
          ) : (
            <button
              onClick={() => checkUpdate(false)}
              disabled={
                status === 'checking' ||
                status === 'downloading' ||
                status === 'installing'
              }
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              {status === 'checking' ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              {status === 'checking'
                ? t('checking', 'Checking...')
                : t('checkForUpdates', 'Check for Updates')}
            </button>
          )}
        </div>
      </div>

      {/* Status Details */}
      {status !== 'idle' && (
        <div
          className={cn(
            'text-sm p-3 rounded-md flex items-center gap-2',
            status === 'error'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted'
          )}
        >
          {status === 'error' ? (
            <AlertCircle className="size-4" />
          ) : status === 'up-to-date' ? (
            <CheckCircle2 className="size-4 text-green-500" />
          ) : (
            <InfoIcon className="size-4" />
          )}
          <span>{getStatusMessage()}</span>
        </div>
      )}

      {/* Progress Bar */}
      {(status === 'downloading' || status === 'installing') && (
        <div className="mt-4">
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-300 animate-pulse"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
