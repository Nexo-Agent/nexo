import { useEffect, useState, useRef, useCallback } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';
import { useStickToBottom } from 'use-stick-to-bottom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/ui/atoms/dialog/index';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { MessageList } from '@/features/chat/ui/chat/MessageList';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { Message } from '@/features/chat/types';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useGetInstalledAgentsQuery } from '../state/api';

interface AgentChatHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  agentId: string | null;
}

export function AgentChatHistoryDialog({
  open,
  onOpenChange,
  sessionId,
  agentId,
}: AgentChatHistoryDialogProps) {
  const { t: tChat } = useTranslation('chat');
  useAppSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Use RTK Query for agents
  const { data: agents = [] } = useGetInstalledAgentsQuery(undefined, {
    skip: !agentId,
  });

  const agentName =
    agents.find((a) => a.manifest.id === agentId)?.manifest.name ?? null;

  // Setup auto scroll hook
  const { scrollRef, contentRef, scrollToBottom } = useStickToBottom({
    resize: 'smooth',
    initial: 'instant', // Start at the bottom immediately
    damping: 0.7,
    stiffness: 0.05,
    mass: 1.25,
  });

  // Refs for ScrollArea
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Attach scrollRef to ScrollArea viewport
  const attachScroll = useCallback(() => {
    if (scrollAreaRef.current && typeof scrollRef === 'function') {
      const viewport = scrollAreaRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;
      if (viewport) {
        scrollRef(viewport);
      }
    }
  }, [scrollRef]);

  // Ensure viewport is attached when ScrollArea is ready (on every render)
  useEffect(() => {
    attachScroll();
  });

  // Force scroll to bottom when messages are loaded
  useEffect(() => {
    if (open && messages.length > 0 && !loading) {
      // Use a small delay to ensure DOM is updated and ScrollArea is attached
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, messages.length, loading, scrollToBottom]);

  // Fetch agent name effect removed - derived from RTK Query

  // Fetch messages when dialog opens and sessionId changes
  useEffect(() => {
    if (!open || !sessionId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      try {
        // Fetch messages using the same approach as useMessages
        const dbMessages = await invokeCommand<
          Array<{
            id: string;
            role: string;
            content: string;
            timestamp: number;
            assistant_message_id: string | null;
            reasoning: string | null;
            metadata: string | null;
          }>
        >(TauriCommands.GET_MESSAGES, { chatId: sessionId });

        // Transform to Message format
        const transformedMessages: Message[] = dbMessages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant' | 'tool' | 'tool_call',
          content: m.content,
          timestamp: m.timestamp * 1000, // Convert to milliseconds
          assistantMessageId: m.assistant_message_id ?? undefined,
          reasoning: m.reasoning ?? undefined,
          metadata: m.metadata ?? undefined,
        }));

        setMessages(transformedMessages);
      } catch (error) {
        logger.error('Failed to load agent chat history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [open, sessionId]);

  // Filter out tool messages for display (tool results are shown within tool_call messages)
  // MessageList will handle this, but we filter here to match the original behavior
  const displayMessages = messages.filter((m) => m.role !== 'tool');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl sm:max-w-5xl w-full h-[85vh] max-h-[85vh] flex flex-col p-0"
        showCloseButton={true}
      >
        <DialogHeader className="px-6 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">
                {agentName || agentId || 'Agent Chat History'}
              </DialogTitle>
              {agentName && agentId && (
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {agentId}
                </p>
              )}
            </div>
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            )}
          </div>
        </DialogHeader>

        <DialogBody className="overflow-hidden px-0 py-0">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">No messages in this chat</p>
            </div>
          ) : (
            <ScrollArea ref={scrollAreaRef} className="h-full">
              <div ref={contentRef} className="px-6 py-4">
                <div className="mx-auto flex flex-col gap-4">
                  <MessageList
                    messages={displayMessages}
                    enableStreaming={false}
                    enableThinkingItem={false}
                    enablePendingPermissions={false}
                    t={tChat}
                  />
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
