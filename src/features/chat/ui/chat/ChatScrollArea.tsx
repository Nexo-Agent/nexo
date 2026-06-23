import type { ReactNode } from 'react';

interface ChatScrollAreaProps {
  children: ReactNode;
}

export function ChatScrollArea({ children }: ChatScrollAreaProps) {
  return <div className="flex min-h-0 flex-1 py-4">{children}</div>;
}
