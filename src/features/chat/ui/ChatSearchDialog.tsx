import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, CornerDownLeft, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogBody, DialogContent } from '@/ui/atoms/dialog/component';

import { ScrollArea } from '@/ui/atoms/scroll-area';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  setSearchOpen,
  setSearchQuery,
  setFilteredResults,
  SearchResult,
} from '../state/chatSearchSlice';
import { useChats } from '../hooks/useChats';
import { useWorkspaces } from '@/features/workspace';
import { MarkdownContent } from '@/ui/organisms/markdown';
import { setActiveNote } from '@/features/notes/state/notesSlice';
import {
  setRightPanelOpen,
  setRightPanelTab,
} from '@/features/ui/state/uiSlice';

export function ChatSearchDialog() {
  const { t } = useTranslation(['common']);
  const dispatch = useAppDispatch();
  const { selectedWorkspaceId } = useWorkspaces();
  const { chats, handleChatSelect } = useChats(selectedWorkspaceId);
  const notes = useAppSelector((state) => state.notes.notes);

  const searchOpen = useAppSelector((state) => state.chatSearch.searchOpen);
  const searchQuery = useAppSelector((state) => state.chatSearch.searchQuery);
  const filteredResults = useAppSelector(
    (state) => state.chatSearch.filteredResults
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Filter chats and notes based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      dispatch(setFilteredResults([]));
      return;
    }

    const query = searchQuery.toLowerCase();

    // Filter chats
    const chatResults: SearchResult[] = chats
      .filter((chat) => !chat.parentId) // Filter out subagent chats
      .filter(
        (chat) =>
          chat.title.toLowerCase().includes(query) ||
          chat.lastMessage?.toLowerCase().includes(query)
      )
      .map((chat) => ({
        id: chat.id,
        type: 'chat',
        title: chat.title,
        content: chat.lastMessage || '',
        timestamp: chat.timestamp,
      }));

    // Filter notes
    const noteResults: SearchResult[] = notes
      .filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      )
      .map((note) => ({
        id: note.id,
        type: 'note',
        title: note.title,
        content: note.content,
        timestamp: note.updated_at,
      }));

    // Combine and sort by timestamp if available
    const combined = [...chatResults, ...noteResults].sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );

    dispatch(setFilteredResults(combined));
  }, [searchQuery, chats, notes, dispatch]);

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
      setSelectedIndex((prev) =>
        Math.min(prev + 1, filteredResults.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredResults[selectedIndex];
      if (selected) {
        handleResultClick(selected);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(e.target.value));
    setSelectedIndex(0);
  };

  // Scroll selected item into view
  useEffect(() => {
    if (scrollAreaRef.current && filteredResults.length > 0) {
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
  }, [selectedIndex, filteredResults.length]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'chat') {
      handleChatSelect(result.id);
    } else if (result.type === 'note') {
      dispatch(setActiveNote(result.id));
      dispatch(setRightPanelOpen(true));
      dispatch(setRightPanelTab('notes'));
    }
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
          'sm:max-w-2xl overflow-hidden p-0 border border-border/50 shadow-2xl bg-background/80 backdrop-blur-2xl rounded-2xl',
          'top-[15%] translate-y-0' // Fixed top position to prevent input box from moving (no layout shift)
        )}
      >
        <div className="relative flex items-center px-6 w-full">
          <Search className="size-6 text-muted-foreground/50 shrink-0 mr-4" />
          <input
            ref={inputRef}
            placeholder={t('searchChatsPlaceholder', {
              ns: 'common',
              defaultValue: 'Tìm kiếm cuộc trò chuyện hoặc ghi chú...',
            })}
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
          <DialogBody className="p-0 border-t border-border/40 w-full">
            <ScrollArea className="h-[450px]">
              <div ref={scrollAreaRef} className="p-2 space-y-0.5">
                {filteredResults.length > 0 ? (
                  filteredResults.map((result, index) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      data-chat-index={index}
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        'group flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer transition-[background-color,box-shadow,ring] duration-150 w-full',
                        index === selectedIndex
                          ? 'bg-primary/10 shadow-sm ring-1 ring-primary/20'
                          : 'hover:bg-muted/30' // Subtler hover
                      )}
                    >
                      <div
                        className={cn(
                          'size-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200',
                          index === selectedIndex
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/40 text-muted-foreground'
                        )}
                      >
                        {result.type === 'chat' ? (
                          <MessageSquare className="size-5" />
                        ) : (
                          <FileText className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={cn(
                              'flex items-center gap-2 text-base font-medium truncate',
                              index === selectedIndex
                                ? 'text-text-primary'
                                : 'text-text-secondary'
                            )}
                          >
                            <span>{result.title || 'Untitled'}</span>
                          </div>
                          {index === selectedIndex && (
                            <CornerDownLeft className="size-4 text-primary/60 opacity-100" />
                          )}
                        </div>
                        {result.content && (
                          <div className="mt-1 max-h-24 overflow-hidden pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity">
                            <MarkdownContent
                              content={result.content}
                              className="text-sm prose-p:my-0 prose-pre:my-1 prose-pre:bg-transparent prose-pre:p-0 prose-code:text-xs prose-headings:text-sm prose-img:hidden prose-video:hidden text-text-muted"
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
                      {t('noResultsFound', {
                        ns: 'common',
                        defaultValue: 'Không tìm thấy kết quả',
                      })}
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
