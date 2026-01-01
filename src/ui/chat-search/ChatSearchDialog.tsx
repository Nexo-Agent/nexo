import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { Input } from '@/ui/atoms/input';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setSearchOpen,
  setSearchQuery,
  setFilteredChats,
} from '@/store/slices/chatSearchSlice';
import { useChats } from '@/hooks/useChats';
import { useWorkspaces } from '@/hooks/useWorkspaces';

export function ChatSearchDialog() {
  const { t } = useTranslation(['common']);
  const dispatch = useAppDispatch();
  const { selectedWorkspaceId } = useWorkspaces();
  const { chats, handleChatSelect } = useChats(selectedWorkspaceId);

  const searchOpen = useAppSelector((state) => state.chatSearch.searchOpen);
  const searchQuery = useAppSelector((state) => state.chatSearch.searchQuery);
  const filteredChats = useAppSelector(
    (state) => state.chatSearch.filteredChats
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Filter chats based on search query
  // Use a ref to track previous chats length to avoid unnecessary re-filtering
  const prevChatsLengthRef = useRef(chats.length);

  useEffect(() => {
    if (!searchQuery.trim()) {
      dispatch(setFilteredChats([]));
      prevChatsLengthRef.current = chats.length;
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = chats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(query) ||
        chat.lastMessage?.toLowerCase().includes(query)
    );
    dispatch(setFilteredChats(filtered));
    prevChatsLengthRef.current = chats.length;
  }, [searchQuery, chats, dispatch]); // Only depend on chats.length, not the whole array

  // Focus input when dialog opens
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [searchOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredChats.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredChats[selectedIndex]) {
        handleChatSelect(filteredChats[selectedIndex].id);
        dispatch(setSearchOpen(false));
      }
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (scrollAreaRef.current && filteredChats.length > 0) {
      const selectedElement = scrollAreaRef.current.querySelector(
        `[data-chat-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex, filteredChats.length]);

  const handleChatClick = (chatId: string) => {
    handleChatSelect(chatId);
    dispatch(setSearchOpen(false));
  };

  return (
    <Dialog
      open={searchOpen}
      onOpenChange={(open) => dispatch(setSearchOpen(open))}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-4" />
            {t('searchChats', { ns: 'common' })}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <Input
              ref={inputRef}
              placeholder={t('searchChatsPlaceholder', { ns: 'common' })}
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              onKeyDown={handleKeyDown}
              className="w-full"
            />
            {filteredChats.length > 0 && (
              <ScrollArea className="max-h-[300px] [&_[data-slot='scroll-area-scrollbar']]:hidden">
                <div ref={scrollAreaRef} className="space-y-1 pr-4">
                  {filteredChats.map((chat, index) => (
                    <div
                      key={chat.id}
                      data-chat-index={index}
                      onClick={() => handleChatClick(chat.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        index === selectedIndex &&
                          'bg-accent text-accent-foreground'
                      )}
                    >
                      <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium line-clamp-1">
                          {chat.title}
                        </div>
                        {chat.lastMessage && (
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {chat.lastMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {searchQuery.trim() && filteredChats.length === 0 && (
              <div className="text-center text-sm text-muted-foreground">
                {t('noChatsFound', { ns: 'common' })}
              </div>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
