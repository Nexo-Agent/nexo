import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { clearBrowserPendingUrl } from '@/features/ui/state/uiSlice';
import { useBrowserTabs } from '../hooks/useBrowserTabs';
import { notifyBrowserError } from '../lib/handleBrowserError';
import { BrowserView } from './BrowserView';

export function BrowserPanel() {
  const { t } = useTranslation('browser');
  const dispatch = useAppDispatch();
  const browserPendingUrl = useAppSelector(
    (state) => state.ui.browserPendingUrl
  );
  const { panelTabs, loading, navigateToUrl } = useBrowserTabs();

  useEffect(() => {
    if (!browserPendingUrl) return;
    const url = browserPendingUrl;
    dispatch(clearBrowserPendingUrl());
    navigateToUrl(url).catch((error) => {
      notifyBrowserError(error);
    });
  }, [browserPendingUrl, dispatch, navigateToUrl]);

  if (!loading && panelTabs.length === 0 && !browserPendingUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Globe className="mb-2 size-8 text-muted-foreground opacity-50" />
        <p className="text-sm font-medium">{t('noChatTitle')}</p>
        <p className="text-xs text-muted-foreground">
          {t('noChatDescription')}
        </p>
      </div>
    );
  }

  if (loading || (browserPendingUrl && panelTabs.length === 0)) {
    return (
      <div className="flex h-full flex-col overflow-hidden p-4">
        <BrowserView
          className="h-full min-h-0"
          streamClassName="h-full min-h-[320px]"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <BrowserView
        className="h-full min-h-0"
        streamClassName="h-full min-h-[320px]"
      />
    </div>
  );
}
