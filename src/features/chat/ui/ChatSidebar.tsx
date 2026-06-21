import { useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Settings,
  SlidersHorizontal,
  Download,
  Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { Button } from '@/ui/atoms/button/button';
import { Input } from '@/ui/atoms/input';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ContextMenu } from '@/ui/atoms/context-menu';
import type { Message } from '@/app/types';
import { useChats } from '../hooks/useChats';
import { useWorkspaces } from '@/features/workspace';
import { WorkspaceSelector } from '@/features/workspace/ui/WorkspaceSelector';
import { useExportChat } from '@/features/chat/hooks/useExportChat';
import { useAppDispatch } from '@/app/hooks';
import {
  setWorkspaceSettingsOpen,
  navigateToSettings,
} from '@/features/ui/state/uiSlice';
import { setSearchOpen } from '../state/chatSearchSlice';
import { logger } from '@/lib/logger';
import { ConfirmDialog } from '@/ui/molecules/ConfirmDialog';
import { SidebarUpdateButton } from '@/features/updater/ui/SidebarUpdateButton';
import { ConversationList } from './ConversationList';
import { SidebarColumnRow } from '@/features/ui/ui/SidebarColumnRow';
import {
  SIDEBAR_ICON,
  SIDEBAR_LIST,
  sidebarItemClass,
} from '@/features/ui/lib/sidebarStyles';

export function ChatSidebar() {
  // Use workspaces hook to get selectedWorkspaceId
  const { selectedWorkspaceId } = useWorkspaces();

  // Use chats hook
  const {
    chats,
    selectedChatId,
    handleNewChat,
    handleChatSelect,
    handleDeleteChat,
    handleRenameChat,
  } = useChats(selectedWorkspaceId);
  const { handleExportMarkdown } = useExportChat();
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
  const [isDeletingChat, setIsDeletingChat] = useState(false);

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
      logger.error('Error renaming chat:', error);
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
      setIsDeletingChat(true);
      await handleDeleteChat(chatToDelete);
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    } catch (error) {
      logger.error('Error deleting chat:', error);
    } finally {
      setIsDeletingChat(false);
    }
  };

  const handleExport = async (chatId: string) => {
    try {
      const messages = await invokeCommand<Message[]>(
        TauriCommands.GET_MESSAGES,
        {
          chatId,
        }
      );

      handleExportMarkdown(chatId, messages);
    } catch (error) {
      logger.error('Failed to export chat from sidebar:', error);
    }
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-sidebar select-none">
      <SidebarColumnRow className="shrink-0 pt-1">
        <div className={SIDEBAR_LIST}>
          <button
            type="button"
            className={sidebarItemClass()}
            onClick={handleNewChat}
          >
            <Plus className={SIDEBAR_ICON} />
            <span className="truncate">{t('common:newConversation')}</span>
          </button>
          <button
            type="button"
            className={sidebarItemClass()}
            onClick={() => dispatch(setSearchOpen(true))}
          >
            <Search className={SIDEBAR_ICON} />
            <span className="truncate">{t('common:searchChats')}</span>
          </button>
          <button
            type="button"
            className={sidebarItemClass()}
            onClick={() => dispatch(navigateToSettings())}
          >
            <SlidersHorizontal className={SIDEBAR_ICON} />
            <span className="truncate">{t('common:settings')}</span>
          </button>
          <button
            type="button"
            className={sidebarItemClass()}
            onClick={() => dispatch(setWorkspaceSettingsOpen(true))}
          >
            <Settings className={SIDEBAR_ICON} />
            <span className="truncate">{t('settings:workspaceSettings')}</span>
          </button>
        </div>
      </SidebarColumnRow>

      <ScrollArea className="mt-5 min-h-0 min-w-0 flex-1">
        <SidebarColumnRow className="pb-1 min-w-0">
          <ConversationList
            chats={chats}
            selectedChatId={selectedChatId}
            onSelect={(chatId) => {
              setContextMenu(null);
              handleChatSelect(chatId);
            }}
            onContextMenu={handleContextMenu}
          />
        </SidebarColumnRow>
      </ScrollArea>

      <SidebarColumnRow className="mt-auto shrink-0 space-y-1 pb-1.5 pt-1">
        <SidebarUpdateButton />
        <WorkspaceSelector compact />
      </SidebarColumnRow>

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
                  label: t('chat:exportChat'),
                  icon: <Download className="size-4" />,
                  onClick: () => handleExport(contextMenu.chatId),
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
      <Dialog
        open={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open);
          if (!open) {
            setChatToRename(null);
            setNewChatTitle('');
          }
        }}
      >
        <DialogContent className="items-stretch gap-0 p-4 sm:max-w-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveRename();
            }}
            className="flex flex-col gap-3"
          >
            <DialogTitle className="m-0 text-sm font-medium leading-none">
              {t('common:renameConversation')}
            </DialogTitle>
            <Input
              id="chat-name"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              placeholder={t('common:enterNewName')}
              className="h-8"
              autoFocus
              aria-label={t('common:enterNewName')}
            />
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setRenameDialogOpen(false);
                  setChatToRename(null);
                  setNewChatTitle('');
                }}
              >
                {t('common:cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-7 px-3"
                disabled={!newChatTitle.trim()}
              >
                {t('common:save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Chat Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setChatToDelete(null);
        }}
        title={t('settings:deleteChat')}
        description={t('settings:confirmDeleteChat', {
          title: chats.find((c) => c.id === chatToDelete)?.title ?? '',
        })}
        onConfirm={handleConfirmDelete}
        confirmLabel={t('common:delete')}
        isLoading={isDeletingChat}
        compact
      />
    </div>
  );
}
