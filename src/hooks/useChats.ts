import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchChats,
  createChat,
  setSelectedChat,
  removeChat,
  updateChatTitle,
} from '@/store/slices/chatsSlice';
import {
  pauseStreaming,
  resumeStreaming,
  stopStreaming,
} from '@/store/slices/messages';
import { showError, showSuccess } from '@/store/slices/notificationSlice';
import { setAttachedFiles } from '@/store/slices/chatInputSlice';

/**
 * Hook to access and manage chats
 */
export function useChats(selectedWorkspaceId: string | null) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation(['common', 'settings']);

  // Selectors - use raw selector first
  const chatsByWorkspaceId = useAppSelector(
    (state) => state.chats.chatsByWorkspaceId
  );

  // Memoize chats to avoid creating new array reference on every render
  const chats = useMemo(() => {
    if (!selectedWorkspaceId) return [];
    return chatsByWorkspaceId[selectedWorkspaceId] || [];
  }, [selectedWorkspaceId, chatsByWorkspaceId]);
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);
  const streamingByChatId = useAppSelector(
    (state) => state.messages.streamingByChatId
  );
  const pausedStreaming = useAppSelector(
    (state) => state.messages.pausedStreaming
  );

  // Load chats when workspace changes
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    let isMounted = true;
    dispatch(fetchChats(selectedWorkspaceId)).then((result) => {
      if (!isMounted) return;
      if (fetchChats.fulfilled.match(result)) {
        const chats = result.payload.chats;
        if (chats.length === 0) {
          // Create default chat if none exists
          dispatch(
            createChat({
              workspaceId: selectedWorkspaceId,
              title: t('newConversation', { ns: 'common' }),
            })
          );
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedWorkspaceId, dispatch, t]);

  // Handlers
  const handleNewChat = async () => {
    if (!selectedWorkspaceId) return;

    try {
      await dispatch(
        createChat({
          workspaceId: selectedWorkspaceId,
          title: t('newConversation', { ns: 'common' }),
        })
      ).unwrap();
    } catch (error) {
      console.error('Error creating new chat:', error);
      dispatch(showError(t('cannotCreateChat', { ns: 'settings' })));
    }
  };

  const handleChatSelect = (chatId: string) => {
    // If switching from a thread that's currently streaming, pause it
    if (selectedChatId && selectedChatId !== chatId) {
      const currentStreamingMessageId = streamingByChatId[selectedChatId];
      if (currentStreamingMessageId) {
        dispatch(pauseStreaming(selectedChatId));
      }
    }

    dispatch(setSelectedChat(chatId));
    dispatch(setAttachedFiles([])); // Clear files when switching chats

    // If the new thread has paused streaming, resume it
    if (pausedStreaming[chatId]) {
      dispatch(resumeStreaming(chatId));
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      // Stop streaming if this chat is streaming
      if (streamingByChatId[chatId]) {
        dispatch(stopStreaming(chatId));
      }

      await dispatch(removeChat(chatId)).unwrap();

      // If deleted chat was selected, select first remaining chat or create new one
      if (selectedChatId === chatId) {
        const remainingChats = chats.filter((chat) => chat.id !== chatId);
        if (remainingChats.length > 0) {
          dispatch(setSelectedChat(remainingChats[0].id));
        } else if (selectedWorkspaceId) {
          await handleNewChat();
        }
      }

      dispatch(
        showSuccess(
          t('chatDeleted', { ns: 'settings' }),
          t('chatDeletedDescription', { ns: 'settings' })
        )
      );
    } catch (error) {
      console.error('Error deleting chat:', error);
      dispatch(showError(t('cannotDeleteChat', { ns: 'settings' })));
      throw error;
    }
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    try {
      await dispatch(
        updateChatTitle({
          id: chatId,
          title: newTitle,
        })
      ).unwrap();
    } catch (error) {
      console.error('Error renaming chat:', error);
      dispatch(showError(t('cannotRenameChat', { ns: 'settings' })));
      throw error;
    }
  };

  return {
    chats,
    selectedChatId,
    streamingByChatId,
    pausedStreaming,
    handleNewChat,
    handleChatSelect,
    handleDeleteChat,
    handleRenameChat,
  };
}
