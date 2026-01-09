import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { Button } from '@/ui/atoms/button/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { navigateToChat } from '@/store/slices/uiSlice';

// Workspace Settings Component
import { WorkspaceSettingsForm } from '@/ui/organisms/workspace/WorkspaceSettingsForm';

// Hooks for Workspace Settings
import { useWorkspaces } from '@/hooks/useWorkspaces';
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
import { useGetLLMConnectionsQuery } from '@/features/llm';
import { useGetMCPConnectionsQuery } from '@/features/mcp';
import type { WorkspaceSettings } from '@/store/types';

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
      console.error('Error clearing all chats:', error);
      dispatch(showError(t('cannotClearAllChats')));
    }
  };

  const onSaveWorkspaceSettings = async (settings: WorkspaceSettings) => {
    try {
      await handleSaveWorkspaceSettings(settings);
      dispatch(navigateToChat());
    } catch (error) {
      console.error('Error saving workspace settings:', error);
      dispatch(showError(t('cannotSaveWorkspaceSettings')));
    }
  };

  const onDeleteWorkspace = async (workspaceId: string) => {
    await handleDeleteWorkspace(workspaceId);
    dispatch(navigateToChat());
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(navigateToChat())}
            className="h-8 w-8"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-semibold">{t('workspaceSettings')}</h1>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 [&_[data-slot='scroll-area-scrollbar']]:hidden">
          <div className="p-4 max-w-4xl mx-auto w-full">
            {selectedWorkspace ? (
              <WorkspaceSettingsForm
                workspace={selectedWorkspace}
                initialSettings={workspaceSettings[selectedWorkspace.id]}
                llmConnections={llmConnections}
                allMcpConnections={allMcpConnections}
                hasChats={chats.length > 0}
                onOpenChange={() => {}} // Not needed in page view
                onSave={onSaveWorkspaceSettings}
                onDeleteWorkspace={onDeleteWorkspace}
                onClearAllChats={handleClearAllChats}
              />
            ) : (
              <div className="text-center text-muted-foreground py-12">
                {t('common:noWorkspaceSelected')}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
