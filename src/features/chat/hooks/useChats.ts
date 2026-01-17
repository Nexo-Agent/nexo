import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  fetchChats,
  createChat,
  setSelectedChat,
  removeChat,
  updateChatTitle,
} from '../state/chatsSlice';
import {
  pauseStreaming,
  resumeStreaming,
  stopStreaming,
} from '../state/messages';
import { showError } from '@/features/notifications/state/notificationSlice';
import { setAttachedFiles } from '../state/chatInputSlice';
import { logger } from '@/lib/logger';

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

    // Check if chats already exist for this workspace to avoid duplicate fetches
    // Check if key exists in object (not just value) to handle empty arrays correctly
    if (selectedWorkspaceId in chatsByWorkspaceId) {
      // Chats already loaded for this workspace (even if empty array), skip fetch
      // This prevents duplicate fetches when multiple components use this hook
      return;
    }

    let isMounted = true;
    dispatch(fetchChats(selectedWorkspaceId)).then((result) => {
      if (!isMounted) return;
      if (fetchChats.fulfilled.match(result)) {
        // Chat fetching completed
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedWorkspaceId, dispatch, chatsByWorkspaceId]);

  // Ensure the selected chat belongs to the current workspace
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    const workspaceChats = chatsByWorkspaceId[selectedWorkspaceId];
    if (workspaceChats && workspaceChats.length > 0) {
      const isCurrentChatInWorkspace = workspaceChats.some(
        (c) => c.id === selectedChatId
      );
      if (!isCurrentChatInWorkspace) {
        dispatch(setSelectedChat(workspaceChats[0].id));
      }
    }
  }, [selectedWorkspaceId, selectedChatId, chatsByWorkspaceId, dispatch]);

  // Handlers
  const handleNewChat = async () => {
    if (!selectedWorkspaceId) return;

    // Cleanup current chat if it's empty before creating a new one
    if (selectedChatId) {
      const currentChat = chats.find((c) => c.id === selectedChatId);
      if (currentChat && !currentChat.lastMessage && !currentChat.parentId) {
        dispatch(removeChat(selectedChatId));
      }
    }

    try {
      await dispatch(
        createChat({
          workspaceId: selectedWorkspaceId,
          title: t('newConversation', { ns: 'common' }),
        })
      ).unwrap();
    } catch (error) {
      logger.error('Error creating new chat:', error);
      dispatch(showError(t('cannotCreateChat', { ns: 'settings' })));
    }
  };

  const handleChatSelect = (chatId: string) => {
    // If switching from a thread that's currently streaming, pause it
    if (selectedChatId && selectedChatId !== chatId) {
      // Cleanup previous chat if it's empty
      const prevChat = chats.find((c) => c.id === selectedChatId);
      if (prevChat && !prevChat.lastMessage && !prevChat.parentId) {
        dispatch(removeChat(selectedChatId));
      }

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
    } catch (error) {
      logger.error('Error deleting chat:', error);
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
      logger.error('Error renaming chat:', error);
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
