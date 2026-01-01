import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/ui/atoms/dialog/component';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearAllChats,
  createChat,
  setSelectedChat,
} from '@/store/slices/chatsSlice';
import {
  clearMessages,
  clearStreamingByChatId,
  stopStreaming,
} from '@/store/slices/messages';
import { showError, showSuccess } from '@/store/slices/notificationSlice';
import { WorkspaceSettingsForm } from './WorkspaceSettingsForm';
import type { WorkspaceSettings } from '@/store/types';

interface WorkspaceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceSettingsDialog({
  open,
  onOpenChange,
}: WorkspaceSettingsProps) {
  const { t } = useTranslation(['settings', 'common']);
  const dispatch = useAppDispatch();
  const {
    selectedWorkspace,
    workspaceSettings,
    handleSaveWorkspaceSettings,
    handleDeleteWorkspace,
  } = useWorkspaces();

  const llmConnections = useAppSelector(
    (state) => state.llmConnections.llmConnections
  );
  const allMcpConnections = useAppSelector(
    (state) => state.mcpConnections.mcpConnections
  );

  // Get chats for the selected workspace to handle clearing
  const chats = useAppSelector((state) =>
    selectedWorkspace
      ? state.chats.chatsByWorkspaceId[selectedWorkspace.id] || []
      : []
  );

  const handleClearAllChats = async (workspaceId: string) => {
    try {
      // Get all chat IDs before clearing
      const chatIds = chats.map((chat) => chat.id);

      // Stop streaming for all chats
      chatIds.forEach((chatId) => {
        dispatch(stopStreaming(chatId));
        dispatch(clearStreamingByChatId(chatId));
      });

      // Clear messages for all chats
      chatIds.forEach((chatId) => {
        dispatch(clearMessages(chatId));
      });

      // Clear all chats from database
      await dispatch(clearAllChats(workspaceId)).unwrap();

      // Create a new default chat
      const newChat = await dispatch(
        createChat({
          workspaceId: workspaceId,
          title: t('newConversation', { ns: 'common' }),
        })
      ).unwrap();

      dispatch(setSelectedChat(newChat.id));

      dispatch(
        showSuccess(
          t('allChatsCleared', { ns: 'settings' }),
          t('allChatsClearedDescription', { ns: 'settings' })
        )
      );
    } catch (error) {
      console.error('Error clearing all chats:', error);
      dispatch(showError(t('cannotClearAllChats', { ns: 'settings' })));
    }
  };

  const onSave = async (settings: WorkspaceSettings) => {
    await handleSaveWorkspaceSettings(settings);
  };

  const onDelete = async (workspaceId: string) => {
    await handleDeleteWorkspace(workspaceId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh] h-[85vh]">
        {selectedWorkspace && (
          <WorkspaceSettingsForm
            key={`${selectedWorkspace.id}-${open}`}
            workspace={selectedWorkspace}
            initialSettings={workspaceSettings[selectedWorkspace.id]}
            llmConnections={llmConnections}
            allMcpConnections={allMcpConnections}
            hasChats={chats.length > 0}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onDeleteWorkspace={onDelete}
            onClearAllChats={handleClearAllChats}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
