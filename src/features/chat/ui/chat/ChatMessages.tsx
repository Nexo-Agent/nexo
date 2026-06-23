import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { MessageList } from './MessageList';
import { ChatScrollArea } from './ChatScrollArea';
import type { Message } from '../../types';
import { useToolPermission } from '../../hooks/useToolPermission';
import { CHAT_WIDTH_CLASSES } from '../ChatLayout';

interface ChatMessagesProps {
  chatId: string | null;
  messages: Message[];
  streamingMessageId: string | null;
  onCancelToolExecution?: () => void;
  onEditMessage?: (messageId: string | null) => void;
}

export function ChatMessages({
  chatId: _chatId,
  messages,
  streamingMessageId,
  onCancelToolExecution,
  onEditMessage,
}: ChatMessagesProps) {
  const { t } = useTranslation('chat');

  const { pendingRequests, handlePermissionRespond } = useToolPermission();

  return (
    <ChatScrollArea>
      <MessageList
        messages={messages}
        enableStreaming={true}
        enablePendingPermissions={true}
        streamingMessageId={streamingMessageId}
        pendingRequests={pendingRequests}
        onPermissionRespond={handlePermissionRespond}
        onCancelToolExecution={onCancelToolExecution}
        onEditingMessageIdChange={onEditMessage}
        t={t}
        className="py-4"
        contentClassName={cn(CHAT_WIDTH_CLASSES, 'pr-8')}
      />
    </ChatScrollArea>
  );
}
