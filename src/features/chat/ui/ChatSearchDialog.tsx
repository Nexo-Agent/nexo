import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, CornerDownLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogBody, DialogContent } from '@/ui/atoms/dialog/component';

import { ScrollArea } from '@/ui/atoms/scroll-area';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  setSearchOpen,
  setSearchQuery,
  setFilteredChats,
} from '../state/chatSearchSlice';
import { useChats } from '../hooks/useChats';
import { useWorkspaces } from '@/features/workspace';
import { MarkdownContent } from '@/ui/organisms/markdown';

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
  useEffect(() => {
    if (!searchQuery.trim()) {
      dispatch(setFilteredChats([]));
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = chats
      .filter((chat) => !chat.parentId) // Filter out subagent chats
      .filter(
        (chat) =>
          chat.title.toLowerCase().includes(query) ||
          chat.lastMessage?.toLowerCase().includes(query)
      );
    dispatch(setFilteredChats(filtered));
  }, [searchQuery, chats, dispatch]);

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
        handleChatClick(filteredChats[selectedIndex].id);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(e.target.value));
    setSelectedIndex(0);
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
      <DialogContent
        showCloseButton={false}
        className={cn(
          'sm:max-w-2xl overflow-hidden p-0 border-none shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] bg-background/70 backdrop-blur-3xl ring-1 ring-white/10 rounded-2xl',
          'top-[15%] translate-y-0' // Fixed top position to prevent input box from moving (no layout shift)
        )}
      >
        <div className="relative flex items-center px-6">
          <Search className="size-6 text-muted-foreground/50 shrink-0 mr-4" />
          <input
            ref={inputRef}
            placeholder={t('searchChatsPlaceholder', { ns: 'common' })}
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className={cn(
              'h-20 w-full bg-transparent text-2xl font-light outline-none placeholder:text-muted-foreground/30',
              'py-6'
            )}
          />
        </div>

        {searchQuery.trim() && (
          <DialogBody className="p-0 border-t border-white/5">
            <ScrollArea className="h-[450px]">
              <div ref={scrollAreaRef} className="p-2 space-y-0.5">
                {filteredChats.length > 0 ? (
                  filteredChats.map((chat, index) => (
                    <div
                      key={chat.id}
                      data-chat-index={index}
                      onClick={() => handleChatClick(chat.id)}
                      className={cn(
                        'group flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150',
                        index === selectedIndex
                          ? 'bg-primary/15 shadow-sm ring-1 ring-primary/20'
                          : 'hover:bg-white/1' // Subtler hover
                      )}
                    >
                      <div
                        className={cn(
                          'size-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200',
                          index === selectedIndex
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground'
                        )}
                      >
                        <MessageSquare className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={cn(
                              'text-base font-medium truncate',
                              index === selectedIndex
                                ? 'text-foreground'
                                : 'text-foreground/80'
                            )}
                          >
                            {chat.title}
                          </div>
                          {index === selectedIndex && (
                            <CornerDownLeft className="size-4 text-primary/60 opacity-100" />
                          )}
                        </div>
                        {chat.lastMessage && (
                          <div className="mt-1 max-h-24 overflow-hidden pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity">
                            <MarkdownContent
                              content={chat.lastMessage}
                              className="text-sm prose-p:my-0 prose-pre:my-1 prose-pre:bg-transparent prose-pre:p-0 prose-code:text-xs prose-headings:text-sm prose-img:hidden prose-video:hidden"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-40">
                    <Search className="size-12 mb-4 stroke-[1.5]" />
                    <p className="text-lg font-light">
                      {t('noChatsFound', { ns: 'common' })}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
}
