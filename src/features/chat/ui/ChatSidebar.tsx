import { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Settings,
  Download,
  FileText,
  FileJson,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { Button } from '@/ui/atoms/button/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/atoms/dropdown-menu';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { Separator } from '@/ui/atoms/separator';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ContextMenu } from '@/ui/atoms/context-menu';
import { cn } from '@/lib/utils';
import { useComponentPerformance } from '@/hooks/useComponentPerformance';
import type { Message } from '@/app/types';
import { useChats } from '../hooks/useChats';
import { useWorkspaces } from '@/features/workspace';
import { useExportChat } from '@/features/chat/hooks/useExportChat';
import { useAppDispatch } from '@/app/hooks';
import { navigateToWorkspaceSettings } from '@/features/ui/state/uiSlice';

export function ChatSidebar() {
  // Track render performance
  useComponentPerformance({
    componentName: 'ChatSidebar',
    threshold: 100,
  });

  // Use workspaces hook to get selectedWorkspaceId
  const { selectedWorkspaceId } = useWorkspaces();

  // Use chats hook
  const {
    chats,
    selectedChatId,
    streamingByChatId,
    pausedStreaming,
    handleNewChat,
    handleChatSelect,
    handleDeleteChat,
    handleRenameChat,
  } = useChats(selectedWorkspaceId);
  const { handleExportMarkdown, handleExportJSON } = useExportChat();
  const { t } = useTranslation(['common', 'chat', 'settings']);
  const dispatch = useAppDispatch();
  const [contextMenu, setContextMenu] = useState<{
    chatId: string;
    x: number;
    y: number;
  } | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [chatToRename, setChatToRename] = useState<{
    id: string;
    currentTitle: string;
  } | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');

  const handleRenameClick = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setChatToRename({ id: chatId, currentTitle: chat.title });
      setNewChatTitle(chat.title);
      setRenameDialogOpen(true);
    }
  };

  const handleSaveRename = async () => {
    if (!chatToRename || !newChatTitle.trim()) return;

    try {
      await handleRenameChat(chatToRename.id, newChatTitle.trim());
      setRenameDialogOpen(false);
      setChatToRename(null);
      setNewChatTitle('');
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  };

  const handleDeleteClick = (chatId: string) => {
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      chatId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;

    try {
      await handleDeleteChat(chatToDelete);
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleExport = async (
    e: React.MouseEvent,
    chatId: string,
    format: 'md' | 'json'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const messages = await invokeCommand<Message[]>(
        TauriCommands.GET_MESSAGES,
        {
          chatId,
        }
      );

      if (format === 'md') {
        handleExportMarkdown(chatId, messages);
      } else {
        handleExportJSON(chatId, messages);
      }
    } catch (error) {
      console.error('Failed to export chat from sidebar:', error);
    }
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar select-none">
      {/* New Chat Button */}
      <div className="p-2">
        <Button
          onClick={handleNewChat}
          className="w-full justify-center gap-2"
          variant="default"
        >
          <Plus className="size-4" />
          <span>{t('common:newConversation')}</span>
        </Button>
      </div>

      <Separator />

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="mb-2 size-8 opacity-50" />
              <p>{t('common:noConversations')}</p>
              <p className="text-xs">{t('common:createNewConversation')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {chats
                .filter((chat) => !chat.parentId) // Filter out subagent chats
                .map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      'group relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                      'hover:bg-sidebar-accent',
                      selectedChatId === chat.id && 'bg-sidebar-accent'
                    )}
                    onClick={() => {
                      setContextMenu(null);
                      handleChatSelect(chat.id);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, chat.id)}
                  >
                    <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="line-clamp-1 text-sm font-medium text-sidebar-foreground flex-1">
                          {chat.title}
                        </div>
                        {streamingByChatId[chat.id] && (
                          <Loader2
                            className={cn(
                              'size-3 shrink-0 animate-spin',
                              selectedChatId === chat.id &&
                                !pausedStreaming[chat.id]
                                ? 'text-primary'
                                : 'text-muted-foreground opacity-60'
                            )}
                          />
                        )}
                      </div>
                    </div>

                    {/* Export Button - Visible on hover */}
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 p-0 hover:bg-black/10 dark:hover:bg-white/10"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <Download className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <DropdownMenuItem
                            onClick={(e) => handleExport(e, chat.id, 'md')}
                          >
                            <FileText className="mr-2 size-4" />
                            Markdown (.md)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleExport(e, chat.id, 'json')}
                          >
                            <FileJson className="mr-2 size-4" />
                            JSON (.json)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 mt-auto border-t border-sidebar-border">
        <Button
          onClick={() => {
            dispatch(navigateToWorkspaceSettings());
          }}
          className="w-full justify-start gap-2"
          variant="ghost"
        >
          <Settings className="size-4" />
          <span>{t('settings:workspaceSettings')}</span>
        </Button>
      </div>

      {/* Context Menu */}
      <ContextMenu
        open={contextMenu !== null}
        position={
          contextMenu ? { x: contextMenu.x, y: contextMenu.y } : { x: 0, y: 0 }
        }
        items={
          contextMenu
            ? [
                {
                  label: t('common:rename'),
                  icon: <Pencil className="size-4" />,
                  onClick: () => handleRenameClick(contextMenu.chatId),
                  variant: 'default',
                },
                {
                  label: t('common:delete'),
                  icon: <Trash2 className="size-4" />,
                  onClick: () => handleDeleteClick(contextMenu.chatId),
                  variant: 'destructive',
                },
              ]
            : []
        }
        onClose={() => setContextMenu(null)}
      />

      {/* Rename Chat Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveRename();
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            <DialogHeader>
              <DialogTitle>{t('common:renameConversation')}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {t('common:enterNewName')}
              </p>
            </DialogHeader>
            <DialogBody>
              <div className="space-y-2">
                <Label htmlFor="chat-name">{t('common:enterNewName')}</Label>
                <Input
                  id="chat-name"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder={t('common:enterNewName')}
                  className="w-full"
                  autoFocus
                />
              </div>
            </DialogBody>
            <DialogFooter className="justify-between gap-2">
              <Button
                type="submit"
                disabled={!newChatTitle.trim()}
                className="flex-1"
              >
                {t('common:save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenameDialogOpen(false);
                  setChatToRename(null);
                  setNewChatTitle('');
                }}
                className="flex-1"
              >
                {t('common:cancel')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Chat Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings:deleteChat')}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {t('settings:confirmDeleteChat')}
              {chats.find((c) => c.id === chatToDelete)?.title && (
                <span className="font-semibold">
                  {' '}
                  {chats.find((c) => c.id === chatToDelete)?.title}
                </span>
              )}
              ?
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t('common:cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              {t('common:delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
