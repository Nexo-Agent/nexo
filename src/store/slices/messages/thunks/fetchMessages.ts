import { createAsyncThunk } from '@reduxjs/toolkit';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { extractCodeBlocks } from '@/lib/code-block-extractor';
import type { Message } from '@/store/types';

// Types matching Rust structs
interface DbMessage {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  timestamp: number;
  assistant_message_id: string | null;
  tool_call_id: string | null;
  reasoning: string | null;
}

export const fetchMessages = createAsyncThunk<
  { chatId: string; messages: Message[] },
  string
>('messages/fetchMessages', async (chatId: string) => {
  const dbMessages = await invokeCommand<DbMessage[]>(
    TauriCommands.GET_MESSAGES,
    { chatId }
  );
  return {
    chatId,
    messages: dbMessages.map((m) => {
      // Extract code blocks from content (content is not modified)
      const codeBlocks = extractCodeBlocks(m.content);
      return {
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'tool' | 'tool_call',
        content: m.content, // Keep original content
        timestamp: m.timestamp * 1000, // Convert to milliseconds
        assistantMessageId: m.assistant_message_id ?? undefined,
        codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
        reasoning: m.reasoning ?? undefined,
      };
    }),
  };
});
