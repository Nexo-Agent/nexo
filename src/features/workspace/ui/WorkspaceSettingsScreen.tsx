import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { navigateToChat } from '@/features/ui/state/uiSlice';

// Workspace Settings Component
import { useWorkspaces, WorkspaceSettingsForm } from '@/features/workspace';
import {
  clearAllChats,
  createChat,
  setSelectedChat,
} from '@/features/chat/state/chatsSlice';
import {
  clearMessages,
  clearStreamingByChatId,
  stopStreaming,
} from '@/features/chat/state/messages';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import { useGetLLMConnectionsQuery } from '@/features/llm';
import { useGetMCPConnectionsQuery } from '@/features/mcp';
import type { WorkspaceSettings } from '@/features/workspace/types';

export function WorkspaceSettingsScreen() {
  const { t } = useTranslation(['settings', 'common']);
  const dispatch = useAppDispatch();

  // Workspace Settings Logic
  const {
    selectedWorkspace,
    workspaceSettings,
    handleSaveWorkspaceSettings,
    handleDeleteWorkspace,
  } = useWorkspaces();

  // Handle ESC key to navigate back to chat
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch(navigateToChat());
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dispatch]);

  const { data: llmConnections = [] } = useGetLLMConnectionsQuery();
  const { data: allMcpConnections = [] } = useGetMCPConnectionsQuery();

  const chats = useAppSelector((state) =>
    selectedWorkspace
      ? state.chats.chatsByWorkspaceId[selectedWorkspace.id] || []
      : []
  );

  const handleClearAllChats = async (workspaceId: string) => {
    try {
      const chatIds = chats.map((chat) => chat.id);
      chatIds.forEach((chatId) => {
        dispatch(stopStreaming(chatId));
        dispatch(clearStreamingByChatId(chatId));
      });
      chatIds.forEach((chatId) => {
        dispatch(clearMessages(chatId));
      });
      await dispatch(clearAllChats(workspaceId)).unwrap();
      const newChat = await dispatch(
        createChat({
          workspaceId: workspaceId,
          title: t('common:newConversation'),
        })
      ).unwrap();
      dispatch(setSelectedChat(newChat.id));
      dispatch(
        showSuccess(t('allChatsCleared'), t('allChatsClearedDescription'))
      );
    } catch (error) {
      logger.error('Error clearing all chats in WorkspaceSettings:', error);
      dispatch(showError(t('cannotClearAllChats')));
    }
  };

  const onSaveWorkspaceSettings = async (settings: WorkspaceSettings) => {
    try {
      await handleSaveWorkspaceSettings(settings);
      dispatch(navigateToChat());
    } catch (error) {
      logger.error(
        'Error saving workspace settings in WorkspaceSettings:',
        error
      );
      dispatch(showError(t('cannotSaveWorkspaceSettings')));
    }
  };

  const onDeleteWorkspace = async (workspaceId: string) => {
    await handleDeleteWorkspace(workspaceId);
    dispatch(navigateToChat());
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full">
        {selectedWorkspace ? (
          <WorkspaceSettingsForm
            workspace={selectedWorkspace}
            initialSettings={workspaceSettings[selectedWorkspace.id]}
            llmConnections={llmConnections}
            allMcpConnections={allMcpConnections}
            hasChats={chats.length > 0}
            onOpenChange={() => dispatch(navigateToChat())}
            onSave={onSaveWorkspaceSettings}
            onDeleteWorkspace={onDeleteWorkspace}
            onClearAllChats={handleClearAllChats}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-12">
            {t('common:noWorkspaceSelected')}
          </div>
        )}
      </div>
    </div>
  );
}
