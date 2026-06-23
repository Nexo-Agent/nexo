import { forwardRef, memo, useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { Message } from '../../types';
import type { PermissionRequest } from '@/features/tools/state/toolPermissionSlice';
import { MessageItem } from './MessageItem';
import { AgentActivityTimeline } from './AgentActivityTimeline';
import { sortMessages } from './utils/messageSorting';
import { buildMessageRenderUnits } from './utils/messageGrouping';
import { cn } from '@/lib/utils';
import { useMessageListState } from '../../hooks/useMessageListState';

interface MessageListProps {
  messages: Message[];
  markdownEnabled?: Record<string, boolean>;
  copiedId?: string | null;
  onMarkdownEnabledChange?: (markdownEnabled: Record<string, boolean>) => void;
  onCopiedIdChange?: (copiedId: string | null) => void;
  onEditingMessageIdChange?: (editingMessageId: string | null) => void;
  onEditingContentChange?: (editingContent: string) => void;
  enableStreaming?: boolean;
  enablePendingPermissions?: boolean;
  streamingMessageId?: string | null;
  pendingRequests?: Record<string, PermissionRequest>;
  onPermissionRespond?: (
    messageId: string,
    toolId: string,
    toolName: string,
    approved: boolean
  ) => void | Promise<void>;
  onViewAgentDetails?: (sessionId: string, agentId: string) => void;
  onCancelToolExecution?: () => void;
  t: (key: string) => string;
  className?: string;
  contentClassName?: string;
}

const MessageListScroller = forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(function MessageListScroller({ className, ...props }, ref) {
  return (
    <div
      {...props}
      ref={ref}
      data-slot="chat-message-scroll"
      className={cn('size-full overflow-y-auto overflow-x-hidden', className)}
    />
  );
});

const MessageListContainer = forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(function MessageListContainer({ className, ...props }, ref) {
  return <div {...props} ref={ref} className={cn('w-full', className)} />;
});

export const MessageList = memo(function MessageList({
  messages,
  markdownEnabled: externalMarkdownEnabled,
  copiedId: externalCopiedId,
  onMarkdownEnabledChange,
  onCopiedIdChange,
  onEditingMessageIdChange,
  onEditingContentChange,
  enableStreaming = true,
  enablePendingPermissions = true,
  streamingMessageId = null,
  pendingRequests = {},
  onPermissionRespond,
  onViewAgentDetails,
  onCancelToolExecution,
  t,
  className,
  contentClassName,
}: MessageListProps) {
  const { markdownEnabled, copiedId, handleCopy } = useMessageListState({
    externalMarkdownEnabled,
    externalCopiedId,
    onMarkdownEnabledChange,
    onCopiedIdChange,
  });

  const handleEdit = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        onEditingMessageIdChange?.(messageId);
        onEditingContentChange?.(message.content);
      }
    },
    [messages, onEditingMessageIdChange, onEditingContentChange]
  );

  const sortedMessages = useMemo(() => sortMessages(messages), [messages]);

  const renderUnits = useMemo(
    () =>
      buildMessageRenderUnits(sortedMessages, {
        streamingMessageId: enableStreaming ? streamingMessageId : null,
        pendingRequests: enablePendingPermissions ? pendingRequests : {},
      }),
    [
      sortedMessages,
      enableStreaming,
      streamingMessageId,
      enablePendingPermissions,
      pendingRequests,
    ]
  );

  const lastRenderableMessageId = useMemo(() => {
    for (let i = renderUnits.length - 1; i >= 0; i--) {
      const unit = renderUnits[i];
      if (unit.kind === 'user') return unit.message.id;
      if (unit.kind === 'assistant_turn') {
        const { message } = unit;
        if (message.content.trim() || streamingMessageId === message.id) {
          return message.id;
        }
      }
    }
    return null;
  }, [renderUnits, streamingMessageId]);

  return (
    <div className={cn('min-h-0 w-full flex-1', className)}>
      <Virtuoso
        data={renderUnits}
        defaultItemHeight={220}
        overscan={400}
        style={{ height: '100%' }}
        computeItemKey={(_index, unit) => unit.message.id}
        components={{
          Scroller: MessageListScroller,
          List: MessageListContainer,
        }}
        itemContent={(index, unit) => {
          const prevUnit = index > 0 ? renderUnits[index - 1] : null;
          const nextUnit =
            index < renderUnits.length - 1 ? renderUnits[index + 1] : null;
          const isTurnStart =
            prevUnit?.kind === 'user' && unit.kind === 'assistant_turn';
          const rowClassName = cn(
            index === 0 ? 'pt-0' : isTurnStart ? 'pt-3' : 'pt-6',
            unit.kind === 'user' &&
              nextUnit?.kind === 'assistant_turn' &&
              'pb-1'
          );

          if (unit.kind === 'user') {
            const message = unit.message;
            const isMarkdownEnabled = markdownEnabled[message.id] !== false;

            return (
              <div className={cn('w-full', contentClassName, rowClassName)}>
                <MessageItem
                  message={message}
                  markdownEnabled={isMarkdownEnabled}
                  isCopied={copiedId === message.id}
                  onCopy={handleCopy}
                  onEdit={handleEdit}
                  onViewAgentDetails={onViewAgentDetails}
                  isStreaming={false}
                  isLastMessage={message.id === lastRenderableMessageId}
                  t={t}
                />
              </div>
            );
          }

          const { message, activity, pending } = unit;
          const isMarkdownEnabled = markdownEnabled[message.id] !== false;
          const isStreaming =
            enableStreaming && streamingMessageId === message.id;
          const hasContent = message.content.trim().length > 0;
          const showMessage = hasContent || isStreaming;

          return (
            <div
              className={cn(
                'flex w-full flex-col gap-3',
                contentClassName,
                rowClassName
              )}
            >
              {activity ? (
                <AgentActivityTimeline
                  activity={activity}
                  onPermissionRespond={onPermissionRespond}
                  onCancelToolExecution={onCancelToolExecution}
                  pending={pending}
                  pendingMessageId={message.id}
                  t={t}
                />
              ) : pending ? (
                <AgentActivityTimeline
                  activity={{ steps: [], defaultExpanded: true }}
                  onPermissionRespond={onPermissionRespond}
                  onCancelToolExecution={onCancelToolExecution}
                  pending={pending}
                  pendingMessageId={message.id}
                  t={t}
                />
              ) : null}

              {showMessage ? (
                <MessageItem
                  message={message}
                  markdownEnabled={isMarkdownEnabled}
                  isCopied={copiedId === message.id}
                  onCopy={handleCopy}
                  onEdit={handleEdit}
                  onViewAgentDetails={onViewAgentDetails}
                  isStreaming={isStreaming}
                  isLastMessage={message.id === lastRenderableMessageId}
                  t={t}
                />
              ) : null}
            </div>
          );
        }}
      />
    </div>
  );
});
