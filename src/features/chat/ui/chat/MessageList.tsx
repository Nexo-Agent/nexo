import { useMemo, useCallback, forwardRef, Fragment } from 'react';
import type { Message } from '../../types';
import type { PermissionRequest } from '@/features/tools/state/toolPermissionSlice';
import { ToolCallItem } from './ToolCallItem';
import { ThinkingItem } from './ThinkingItem';
import { MessageItem } from './MessageItem';
import { useComponentPerformance } from '@/hooks/useComponentPerformance';
import {
  getAssistantMessageIdsWithToolCalls,
  sortMessages,
} from './utils/messageSorting';
import { cn } from '@/lib/utils';
import { useMessageListState } from '../../hooks/useMessageListState';

/**
 * Helper function to create a composite key for tool calls
 * This prevents conflicts between different types of tool calls
 * @param id - The tool call ID
 * @param type - The type of tool call ('message' | 'permission')
 */
function createToolCallKey(id: string, type: 'message' | 'permission'): string {
  return `${type}:${id}`;
}

interface MessageListProps {
  // Data
  messages: Message[];

  // State (optional - if not provided, MessageList manages internally)
  markdownEnabled?: Record<string, boolean>;
  copiedId?: string | null;
  expandedToolCalls?: Record<string, boolean>;
  onMarkdownEnabledChange?: (markdownEnabled: Record<string, boolean>) => void;
  onCopiedIdChange?: (copiedId: string | null) => void;
  onEditingMessageIdChange?: (editingMessageId: string | null) => void;
  onEditingContentChange?: (editingContent: string) => void;
  onExpandedToolCallsChange?: (
    expandedToolCalls: Record<string, boolean>
  ) => void;

  // Feature flags (optional - default from ChatMessages behavior)
  enableStreaming?: boolean; // default: true
  enableThinkingItem?: boolean; // default: true
  enablePendingPermissions?: boolean; // default: true
  streamingMessageId?: string | null;
  pendingRequests?: Record<string, PermissionRequest>;

  // Callbacks (optional - MessageList provides default implementations)
  // Default no-op handler if not provided
  onPermissionRespond?: (
    messageId: string,
    toolId: string,
    toolName: string,
    approved: boolean
  ) => void | Promise<void>;
  onViewAgentDetails?: (sessionId: string, agentId: string) => void;
  onCancelToolExecution?: () => void;

  // Other
  showUsage?: boolean;
  t: (key: string) => string;
  isLoading?: boolean;
  className?: string;
  permissionTimeLeft?: Record<string, number>; // Countdown for pending permissions
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  (
    {
      messages,
      markdownEnabled: externalMarkdownEnabled,
      copiedId: externalCopiedId,
      expandedToolCalls: externalExpandedToolCalls,
      onMarkdownEnabledChange,
      onCopiedIdChange,
      onEditingMessageIdChange,
      onEditingContentChange,
      onExpandedToolCallsChange,
      enableStreaming = true,
      enableThinkingItem = true,
      enablePendingPermissions = true,
      streamingMessageId = null,
      pendingRequests = {},
      onPermissionRespond,
      onViewAgentDetails,
      onCancelToolExecution,

      showUsage = false,
      t,
      className,
      permissionTimeLeft = {},
    },
    ref
  ) => {
    // Track render performance
    useComponentPerformance({
      componentName: 'MessageList',
      threshold: 100,
    });

    // Delegated state management
    const {
      markdownEnabled,
      copiedId,
      expandedToolCalls,
      handleCopy,
      toggleMarkdown,
      toggleToolCall,
    } = useMessageListState({
      externalMarkdownEnabled,
      externalCopiedId,
      externalExpandedToolCalls,
      onMarkdownEnabledChange,
      onCopiedIdChange,
      onExpandedToolCallsChange,
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

    // Memoize sorted messages - only recalculate when messages array changes
    const sortedMessages = useMemo(() => sortMessages(messages), [messages]);

    const assistantIdsWithToolCalls = useMemo(
      () => getAssistantMessageIdsWithToolCalls(messages),
      [messages]
    );

    // Find the last message that will be rendered (not skipped)
    const lastRenderableMessageId = useMemo(() => {
      for (let i = sortedMessages.length - 1; i >= 0; i--) {
        const msg = sortedMessages[i];
        // Skip tool messages, but include tool_call and regular messages
        if (msg.role !== 'tool') {
          // For assistant messages, also check if they have content
          if (msg.role === 'assistant' && !msg.content) {
            continue;
          }
          return msg.id;
        }
      }
      return null;
    }, [sortedMessages]);

    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)}>
        {sortedMessages.map((message) => {
          // Skip tool result messages (role="tool") - they are only used internally
          // Tool results are displayed within tool_call messages
          if (message.role === 'tool') {
            return null;
          }

          // Handle tool_call messages separately (completed/executing)
          if (message.role === 'tool_call') {
            const toolCallKey = createToolCallKey(message.id, 'message');
            return (
              <ToolCallItem
                key={message.id}
                message={message}
                isExpanded={expandedToolCalls[toolCallKey] ?? false}
                onToggle={() => toggleToolCall(toolCallKey, false)}
                onCancel={onCancelToolExecution}
                t={t}
              />
            );
          }

          // Regular messages (user/assistant)
          const isMarkdownEnabled = markdownEnabled[message.id] !== false;
          const pending =
            enablePendingPermissions && message.role === 'assistant'
              ? pendingRequests[message.id]
              : null;

          const isIntermediateAssistantStep =
            message.role === 'assistant' &&
            assistantIdsWithToolCalls.has(message.id);

          const showThinking = Boolean(
            enableThinkingItem &&
            message.role === 'assistant' &&
            (message.reasoning ||
              (enableStreaming &&
                streamingMessageId === message.id &&
                !message.content))
          );
          const hasMeaningfulContent = message.content.trim().length > 0;
          const showMessage = Boolean(
            message.role !== 'assistant' ||
            (isIntermediateAssistantStep
              ? hasMeaningfulContent
              : message.content)
          );

          const showTokenUsage = showUsage && !isIntermediateAssistantStep;

          return (
            <Fragment key={message.id}>
              {(showThinking || showMessage) && (
                <div className="flex flex-col gap-1">
                  {showThinking && (
                    <ThinkingItem
                      key={`thinking-${message.id}`}
                      content={message.reasoning || ''}
                      isStreaming={
                        enableStreaming &&
                        streamingMessageId === message.id &&
                        !message.content
                      }
                    />
                  )}
                  {showMessage && (
                    <MessageItem
                      key={`content-${message.id}`}
                      message={message}
                      showUsage={showTokenUsage}
                      markdownEnabled={isMarkdownEnabled}
                      isCopied={copiedId === message.id}
                      onToggleMarkdown={toggleMarkdown}
                      onCopy={handleCopy}
                      onEdit={handleEdit}
                      onViewAgentDetails={onViewAgentDetails}
                      isStreaming={
                        enableStreaming && streamingMessageId === message.id
                      }
                      isLastMessage={message.id === lastRenderableMessageId}
                      t={t}
                    />
                  )}
                </div>
              )}

              {/* Render Pending Tool Calls */}
              {enablePendingPermissions &&
                pending &&
                pending.toolCalls.map((tc) => {
                  const timeLeftValue = permissionTimeLeft[message.id];
                  const toolCallKey = createToolCallKey(tc.id, 'permission');

                  return (
                    <ToolCallItem
                      key={`permission-${tc.id}`}
                      data={{
                        id: tc.id,
                        name: tc.name,
                        arguments: tc.arguments,
                        status: 'pending_permission',
                      }}
                      isExpanded={expandedToolCalls[toolCallKey] ?? true} // Default to expanded
                      onToggle={() => toggleToolCall(toolCallKey, true)}
                      onCancel={onCancelToolExecution}
                      timeLeft={timeLeftValue}
                      t={t}
                      onRespond={
                        onPermissionRespond
                          ? (allow: boolean) =>
                              onPermissionRespond(
                                message.id,
                                tc.id,
                                tc.name,
                                allow
                              )
                          : undefined
                      }
                    />
                  );
                })}
            </Fragment>
          );
        })}
      </div>
    );
  }
);

MessageList.displayName = 'MessageList';
