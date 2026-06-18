import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { BrowserView } from './BrowserView';

export function BrowserPanel() {
  const { t } = useTranslation('browser');
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);
  const browserPendingUrl = useAppSelector(
    (state) => state.ui.browserPendingUrl
  );
  const browserNavigationSeq = useAppSelector(
    (state) => state.ui.browserNavigationSeq
  );

  if (!selectedChatId) {
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

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <BrowserView
        key={`browser-${browserNavigationSeq}`}
        chatId={selectedChatId}
        initialUrl={browserPendingUrl ?? undefined}
        autoStart={browserPendingUrl != null}
        className="h-full min-h-0"
        streamClassName="h-full min-h-[320px]"
      />
    </div>
  );
}
