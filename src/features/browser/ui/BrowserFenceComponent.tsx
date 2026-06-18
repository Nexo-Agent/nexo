import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/app/hooks';
import { BrowserView } from './BrowserView';

interface BrowserFenceComponentProps {
  code: string;
  className?: string;
}

function isValidBrowserUrl(raw: string): boolean {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    return ['http:', 'https:', 'file:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function BrowserFenceComponent({
  code,
  className,
}: BrowserFenceComponentProps) {
  const { t } = useTranslation('browser');
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);
  const url = code.trim();

  const validUrl = useMemo(() => (isValidBrowserUrl(url) ? url : null), [url]);

  if (!validUrl) {
    return (
      <p className="text-sm text-destructive my-2">{t('fenceInvalidUrl')}</p>
    );
  }

  return (
    <BrowserView
      chatId={selectedChatId ?? undefined}
      initialUrl={validUrl}
      autoStart
      showChrome={false}
      className={className}
      streamClassName="min-h-64"
    />
  );
}
