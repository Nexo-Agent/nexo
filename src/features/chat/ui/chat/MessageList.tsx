import { useMemo, useState, useCallback, forwardRef, Fragment } from 'react';
import type { Message } from '../../types';
import type { PermissionRequest } from '@/features/tools/state/toolPermissionSlice';
import { ToolCallItem } from './ToolCallItem';
import { ThinkingItem } from './ThinkingItem';
import { MessageItem } from './MessageItem';
import { useComponentPerformance } from '@/hooks/useComponentPerformance';
import { sortMessages } from './utils/messageSorting';
import { cn } from '@/lib/utils';

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

    // Internal state management (if not controlled from parent)
    const [internalMarkdownEnabled, setInternalMarkdownEnabled] = useState<
      Record<string, boolean>
    >({});
    const [internalCopiedId, setInternalCopiedId] = useState<string | null>(
      null
    );
    const [internalExpandedToolCalls, setInternalExpandedToolCalls] = useState<
      Record<string, boolean>
    >({});

    // Use external state if provided, otherwise use internal state
    const markdownEnabled = externalMarkdownEnabled ?? internalMarkdownEnabled;
    const copiedId = externalCopiedId ?? internalCopiedId;
    const expandedToolCalls =
      externalExpandedToolCalls ?? internalExpandedToolCalls;

    // Common handlers - shared logic
    const handleCopy = useCallback(
      async (content: string, messageId: string) => {
        try {
          await navigator.clipboard.writeText(content);
          if (onCopiedIdChange) {
            onCopiedIdChange(messageId);
          } else {
            setInternalCopiedId(messageId);
          }
          setTimeout(() => {
            if (onCopiedIdChange) {
              onCopiedIdChange(null);
            } else {
              setInternalCopiedId(null);
            }
          }, 2000);
        } catch (error) {
          console.error('Failed to copy:', error);
        }
      },
      [onCopiedIdChange]
    );

    const toggleMarkdown = useCallback(
      (messageId: string) => {
        // If undefined, treat as true (markdown enabled by default)
        const currentValue = markdownEnabled[messageId] ?? true;
        const newValue = {
          ...markdownEnabled,
          [messageId]: !currentValue,
        };
        if (onMarkdownEnabledChange) {
          onMarkdownEnabledChange(newValue);
        } else {
          setInternalMarkdownEnabled(newValue);
        }
      },
      [markdownEnabled, onMarkdownEnabledChange]
    );

    const toggleToolCall = useCallback(
      (id: string) => {
        const newValue = {
          ...expandedToolCalls,
          [id]: !expandedToolCalls[id],
        };
        if (onExpandedToolCallsChange) {
          onExpandedToolCallsChange(newValue);
        } else {
          setInternalExpandedToolCalls(newValue);
        }
      },
      [expandedToolCalls, onExpandedToolCallsChange]
    );

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
      <div ref={ref} className={cn('flex flex-col gap-8', className)}>
        {sortedMessages.map((message) => {
          // Skip tool result messages (role="tool") - they are only used internally
          // Tool results are displayed within tool_call messages
          if (message.role === 'tool') {
            return null;
          }

          // Handle tool_call messages separately (completed/executing)
          if (message.role === 'tool_call') {
            return (
              <ToolCallItem
                key={message.id}
                message={message}
                isExpanded={expandedToolCalls[message.id] || false}
                onToggle={toggleToolCall}
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

          return (
            <Fragment key={message.id}>
              {enableThinkingItem &&
                message.role === 'assistant' &&
                message.reasoning && (
                  <ThinkingItem
                    key={`thinking-${message.id}`}
                    content={message.reasoning}
                    isStreaming={
                      enableStreaming &&
                      streamingMessageId === message.id &&
                      !message.content
                    }
                  />
                )}
              {(message.role !== 'assistant' || message.content) && (
                <MessageItem
                  key={`content-${message.id}`}
                  message={message}
                  showUsage={showUsage}
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

              {/* Render Pending Tool Calls */}
              {enablePendingPermissions &&
                pending &&
                pending.toolCalls.map((tc) => {
                  const timeLeftValue = permissionTimeLeft[message.id];

                  return (
                    <ToolCallItem
                      key={`permission-${tc.id}`}
                      data={{
                        id: tc.id,
                        name: tc.name,
                        arguments: tc.arguments,
                        status: 'pending_permission',
                      }}
                      isExpanded={expandedToolCalls[tc.id] !== false} // Default to expanded
                      onToggle={toggleToolCall}
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
