import { createContext, useContext } from 'react';

const MarkdownMessageContext = createContext<string | undefined>(undefined);

export function MarkdownMessageProvider({
  messageId,
  children,
}: {
  messageId?: string;
  children: React.ReactNode;
}) {
  return (
    <MarkdownMessageContext.Provider value={messageId}>
      {children}
    </MarkdownMessageContext.Provider>
  );
}

export function useMarkdownMessageId() {
  return useContext(MarkdownMessageContext);
}
