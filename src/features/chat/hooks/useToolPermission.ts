import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { removePermissionRequest } from '@/features/tools/state/toolPermissionSlice';
import { showError } from '@/features/notifications/state/notificationSlice';
import { messagesApi } from '../state/messagesApi';
import { logger } from '@/lib/logger';

export function useToolPermission() {
  const { t } = useTranslation('chat');
  const dispatch = useAppDispatch();
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);
  const pendingRequests = useAppSelector(
    (state) => state.toolPermission.pendingRequests
  );

  const handlePermissionRespond = useCallback(
    async (
      messageId: string,
      toolId: string,
      toolName: string,
      approved: boolean
    ) => {
      try {
        await invokeCommand(TauriCommands.RESPOND_TOOL_PERMISSION, {
          messageId,
          approved,
          allowedToolIds: approved ? [toolId] : [],
        });

        if (!approved && selectedChatId) {
          const content = `**System Notification:** Tool \`${toolName}\` denied by user. Flow cancelled.`;
          const id = crypto.randomUUID();
          const timestamp = Date.now();

          // Persist message to backend
          await invokeCommand(TauriCommands.CREATE_MESSAGE, {
            id,
            chatId: selectedChatId,
            role: 'assistant',
            content,
            timestamp,
            assistantMessageId: null,
            toolCallId: null,
          });

          // Refresh messages (Server State)
          dispatch(
            messagesApi.util.invalidateTags([
              { type: 'Message', id: `LIST_${selectedChatId}` },
            ])
          );
        }

        dispatch(removePermissionRequest(messageId));
      } catch (error) {
        logger.error('Failed to respond to tool permission:', error);
      }
    },
    [dispatch, selectedChatId]
  );

  // Countdown for pending permissions
  const [permissionTimeLeft, setPermissionTimeLeft] = useState<
    Record<string, number>
  >({});

  // Track which requests have already been timed out to prevent infinite loop
  const processedTimeoutsRef = useRef<Set<string>>(new Set());

  // Keep ref of pendingRequests to avoid resetting interval on every change
  const pendingRequestsRef = useRef(pendingRequests);
  useEffect(() => {
    pendingRequestsRef.current = pendingRequests;
  }, [pendingRequests]);

  // Timeout for pending permissions — only tick while requests exist
  const hasPendingPermissions = Object.keys(pendingRequests).length > 0;

  useEffect(() => {
    if (!hasPendingPermissions) {
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const TIMEOUT_MS = 60 * 1000; // 60s
      const currentPending = pendingRequestsRef.current;

      const newTimeLeft: Record<string, number> = {};
      const activeIds = new Set<string>();

      Object.values(currentPending).forEach((req) => {
        activeIds.add(req.messageId);
        if (req.timestamp) {
          const elapsed = now - req.timestamp;
          const remaining = Math.max(0, TIMEOUT_MS - elapsed);
          newTimeLeft[req.messageId] = Math.ceil(remaining / 1000);

          // Only process timeout once per request
          if (
            elapsed > TIMEOUT_MS &&
            !processedTimeoutsRef.current.has(req.messageId)
          ) {
            processedTimeoutsRef.current.add(req.messageId);

            // Reject all tools in the request (this will auto-remove from pendingRequests)
            req.toolCalls.forEach((tc) => {
              handlePermissionRespond(req.messageId, tc.id, tc.name, false);
            });

            dispatch(
              showError(
                t('toolPermissionTimeout', { ns: 'chat' }) ||
                  'Tool permission request timed out'
              )
            );
          }
        }
      });

      setPermissionTimeLeft((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(newTimeLeft);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every((key) => prev[key] === newTimeLeft[key])
        ) {
          return prev;
        }
        return newTimeLeft;
      });

      // Garbage collection: remove processed IDs that are no longer active to prevent memory leak
      for (const id of processedTimeoutsRef.current) {
        if (!activeIds.has(id)) {
          processedTimeoutsRef.current.delete(id);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hasPendingPermissions, handlePermissionRespond, dispatch, t]);

  return {
    pendingRequests,
    permissionTimeLeft: hasPendingPermissions ? permissionTimeLeft : {},
    handlePermissionRespond,
  };
}
