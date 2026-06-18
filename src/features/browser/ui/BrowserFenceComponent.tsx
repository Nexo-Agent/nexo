import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/app/hooks';
import { useBrowserFence } from '../hooks/useBrowserFence';
import { BrowserView } from './BrowserView';

interface BrowserFenceComponentProps {
  code: string;
  messageId: string;
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
  messageId,
  className,
}: BrowserFenceComponentProps) {
  const { t } = useTranslation('browser');
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);
  const url = code.trim();
  const anchorId = useMemo(() => {
    const chatPart = selectedChatId ?? 'global';
    return `${chatPart}:${messageId}`;
  }, [selectedChatId, messageId]);

  const validUrl = useMemo(() => (isValidBrowserUrl(url) ? url : null), [url]);
  const { tabId, error } = useBrowserFence(
    anchorId,
    selectedChatId ?? undefined,
    validUrl ?? ''
  );

  if (!validUrl) {
    return (
      <p className="text-sm text-destructive my-2">{t('fenceInvalidUrl')}</p>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive my-2">{error}</p>;
  }

  return (
    <BrowserView
      showChrome={false}
      fenceTabId={tabId}
      fenceAnchorId={anchorId}
      initialUrl={validUrl}
      className={className}
      streamClassName="min-h-64"
    />
  );
}
