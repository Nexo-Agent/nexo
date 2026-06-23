import { useCallback, memo, useState, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { MarkdownContent } from '@/ui/organisms/markdown/MarkdownContent';
import { AgentCard } from './AgentCard';
import { MessageMentions } from './MessageMentions';
import { parseMessageMentions } from './utils/mentionUtils';
import { FLOW_NODES } from '@/ui/molecules/flow/constants';
import type { Message } from '../../types';
import { parseSkillAttachment } from '../../lib/skillAttachment';
import { SkillChip } from './SkillChip';
import { MessageAttachments } from './components/MessageAttachments';
import { MessageControls } from './components/MessageControls';
import { LazyFlowAttachment } from './LazyFlowAttachment';
import { LazyFlowEditorDialog } from './LazyFlowEditorDialog';

export interface MessageItemProps {
  message: Message;
  markdownEnabled: boolean;
  isCopied: boolean;
  isStreaming: boolean;
  isLastMessage?: boolean;
  onCopy: (content: string, messageId: string) => void;
  onEdit: (messageId: string) => void;
  onViewAgentDetails?: (sessionId: string, agentId: string) => void;
  t: (key: string) => string;
}

export const MessageItem = memo(
  function MessageItem({
    message,
    markdownEnabled,
    isCopied,
    isStreaming,
    isLastMessage = false,
    onCopy,
    onEdit,
    onViewAgentDetails,
    t,
  }: MessageItemProps) {
    const [isFlowDialogOpen, setIsFlowDialogOpen] = useState(false);

    const handleCopy = useCallback(() => {
      onCopy(message.content, message.id);
    }, [message.content, message.id, onCopy]);

    const handleEdit = useCallback(() => {
      onEdit(message.id);
    }, [message.id, onEdit]);

    // Parse metadata only once
    const parsedMetadata = useMemo(() => {
      if (!message.metadata) return null;
      try {
        return JSON.parse(message.metadata);
      } catch {
        return null;
      }
    }, [message.metadata]);

    const agentCardData =
      parsedMetadata?.type === 'agent_card' ? parsedMetadata : null;
    const skillData = parseSkillAttachment(parsedMetadata);
    const flowData =
      parsedMetadata?.type === 'flow_attachment' ? parsedMetadata.flow : null;

    // Parse mentions once
    const { mentions, cleanedContent } = useMemo(
      () => parseMessageMentions(message.content),
      [message.content]
    );

    if (agentCardData) {
      return (
        <div className="flex w-full justify-start my-2">
          <AgentCard
            agentId={agentCardData.agent_id}
            sessionId={agentCardData.session_id}
            status={agentCardData.status}
            onViewDetails={(sessionId) => {
              onViewAgentDetails?.(sessionId, agentCardData.agent_id);
            }}
          >
            {agentCardData.summary && (
              <MarkdownContent
                content={agentCardData.summary}
                messageId={message.id}
                isStreaming={isStreaming}
              />
            )}
          </AgentCard>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'group flex min-w-0 w-full',
          isLastMessage &&
            'animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out',
          message.role === 'user' ? 'justify-end' : 'justify-start'
        )}
      >
        <div
          className={cn(
            'relative w-fit max-w-full',
            message.role === 'assistant' ? 'w-full' : 'ml-auto'
          )}
        >
          <div
            className={cn(
              'relative min-w-0 wrap-break-words rounded-lg px-3 py-2 text-sm leading-relaxed',
              isStreaming && 'will-change-contents',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-none px-0 py-0'
            )}
            style={
              isStreaming
                ? {
                    contain: 'layout style',
                  }
                : undefined
            }
          >
            <div className="relative">
              <div
                className={cn(
                  'overflow-hidden',
                  isStreaming ? 'select-none' : 'select-text'
                )}
              >
                {/* Mentions */}
                {mentions.length > 0 && (
                  <MessageMentions
                    mentions={mentions}
                    role={message.role}
                    className={cn(message.role === 'user' ? 'opacity-90' : '')}
                  />
                )}

                {/* Attachments */}
                {parsedMetadata && (
                  <MessageAttachments
                    files={parsedMetadata.files}
                    images={parsedMetadata.images}
                    fileEntries={parsedMetadata.fileEntries}
                    role={message.role === 'user' ? 'user' : 'assistant'}
                  />
                )}

                {/* Flow Attachment */}
                {flowData && (
                  <div className="mb-2">
                    <LazyFlowAttachment
                      flow={flowData}
                      mode="message"
                      onClick={() => setIsFlowDialogOpen(true)}
                    />
                    <LazyFlowEditorDialog
                      open={isFlowDialogOpen}
                      initialFlow={flowData}
                      availableNodes={FLOW_NODES}
                      onClose={() => setIsFlowDialogOpen(false)}
                      readOnly={true}
                    />
                  </div>
                )}

                {skillData && (
                  <div className="mb-2">
                    <SkillChip
                      name={skillData.skillName}
                      description={skillData.description}
                      mode="message"
                    />
                  </div>
                )}

                {/* Content */}
                {cleanedContent && (
                  <div className="whitespace-pre-wrap wrap-break-words">
                    {message.role === 'assistant' && markdownEnabled ? (
                      <MarkdownContent
                        content={cleanedContent}
                        messageId={message.id}
                        isStreaming={isStreaming}
                      />
                    ) : (
                      cleanedContent
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <MessageControls
            role={message.role}
            content={message.content}
            isCopied={isCopied}
            onEdit={handleEdit}
            onCopy={handleCopy}
            t={t}
            className={cn(
              'absolute z-10',
              message.role === 'user'
                ? 'right-1 bottom-1'
                : 'right-0 top-full mt-0.5'
            )}
          />
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if relevant props change
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.reasoning === nextProps.message.reasoning &&
      prevProps.message.codeBlocks === nextProps.message.codeBlocks &&
      prevProps.message.metadata === nextProps.message.metadata && // Include metadata for agent card updates
      prevProps.markdownEnabled === nextProps.markdownEnabled &&
      prevProps.isCopied === nextProps.isCopied &&
      prevProps.isStreaming === nextProps.isStreaming &&
      prevProps.isLastMessage === nextProps.isLastMessage
    );
  }
);
