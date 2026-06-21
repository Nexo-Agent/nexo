import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatItem } from '../types';
import {
  SIDEBAR_ICON,
  SIDEBAR_TEXT_INSET,
  sidebarItemClass,
} from '@/features/ui/lib/sidebarStyles';

interface ConversationListItemProps {
  chat: ChatItem;
  isSelected: boolean;
  isStreaming?: boolean;
  onSelect: (chatId: string) => void;
  onContextMenu: (e: React.MouseEvent, chatId: string) => void;
}

export const ConversationListItem = memo(function ConversationListItem({
  chat,
  isSelected,
  isStreaming = false,
  onSelect,
  onContextMenu,
}: ConversationListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      title={chat.title}
      className={cn(sidebarItemClass(isSelected), 'overflow-hidden')}
      onClick={() => onSelect(chat.id)}
      onContextMenu={(e) => onContextMenu(e, chat.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(chat.id);
        }
      }}
    >
      {isStreaming ? (
        <Loader2
          className={cn(
            SIDEBAR_ICON,
            'animate-spin text-sidebar-foreground/70'
          )}
          aria-hidden
        />
      ) : (
        <span aria-hidden className={SIDEBAR_TEXT_INSET} />
      )}
      <span className="block min-w-0 flex-1 truncate">{chat.title}</span>
    </div>
  );
});
