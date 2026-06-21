import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';
import { isActiveConversationPhase } from '@/features/chat/state/conversationRuntimeSlice';
import type { ChatItem } from '../types';
import { ConversationListItem } from './ConversationListItem';
import {
  SIDEBAR_TEXT_INSET,
  SIDEBAR_LIST,
} from '@/features/ui/lib/sidebarStyles';

interface ConversationListProps {
  chats: ChatItem[];
  selectedChatId: string | null;
  onSelect: (chatId: string) => void;
  onContextMenu: (e: React.MouseEvent, chatId: string) => void;
}

export function ConversationList({
  chats,
  selectedChatId,
  onSelect,
  onContextMenu,
}: ConversationListProps) {
  const { t } = useTranslation('common');
  const runtimesByChatId = useAppSelector(
    (state) => state.conversationRuntime.byChatId
  );

  const rootChats = useMemo(
    () =>
      [...chats.filter((chat) => !chat.parentId)].sort(
        (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
      ),
    [chats]
  );

  if (rootChats.length === 0) {
    return (
      <p className="flex items-center gap-2 py-3 text-sm text-sidebar-foreground/50">
        <span aria-hidden className={SIDEBAR_TEXT_INSET} />
        <span className="min-w-0 flex-1 truncate">{t('noConversations')}</span>
      </p>
    );
  }

  return (
    <div className={cn(SIDEBAR_LIST, 'min-w-0 max-w-full')}>
      {rootChats.map((chat) => (
        <ConversationListItem
          key={chat.id}
          chat={chat}
          isSelected={selectedChatId === chat.id}
          isStreaming={
            runtimesByChatId[chat.id]
              ? isActiveConversationPhase(runtimesByChatId[chat.id].phase.kind)
              : false
          }
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
