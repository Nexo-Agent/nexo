import { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { Separator } from '@/ui/atoms/separator';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ContextMenu } from '@/ui/atoms/context-menu';
import { cn } from '@/lib/utils';
import { useChats } from '@/hooks/useChats';
import { useWorkspaces } from '@/hooks/useWorkspaces';

import { useAppDispatch } from '@/store/hooks';
import { setWorkspaceSettingsOpen } from '@/store/slices/uiSlice';

export interface ChatItem {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp?: number; // Unix timestamp in milliseconds
}

export function ChatSidebar() {
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

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar select-none">
      {/* New Chat Button */}
      <div className="p-3">
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
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    'group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
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
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 mt-auto border-t border-border">
        <Button
          onClick={() => dispatch(setWorkspaceSettingsOpen(true))}
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
              <DialogDescription>{t('common:enterNewName')}</DialogDescription>
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
            <DialogDescription>
              {t('settings:confirmDeleteChat')}
              {chats.find((c) => c.id === chatToDelete)?.title && (
                <span className="font-semibold">
                  {' '}
                  {chats.find((c) => c.id === chatToDelete)?.title}
                </span>
              )}
              ?
            </DialogDescription>
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
