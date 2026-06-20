import type { ReactNode } from 'react';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { useChatScroll } from '../../hooks/useChatScroll';

interface ChatScrollAreaProps {
  messageCount: number;
  children: ReactNode;
}

export function ChatScrollArea({
  messageCount,
  children,
}: ChatScrollAreaProps) {
  const { contentRef, scrollAreaRef } = useChatScroll(messageCount);

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 py-4">
      <div ref={contentRef}>{children}</div>
    </ScrollArea>
  );
}
