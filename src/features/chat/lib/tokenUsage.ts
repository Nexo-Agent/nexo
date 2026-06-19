import type { Message, TokenUsage } from '../types';

export function aggregateConversationTokenUsage(
  messages: Message[]
): TokenUsage | null {
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let hasPromptTokens = false;
  let hasCompletionTokens = false;
  let hasTotalTokens = false;

  for (const message of messages) {
    if (message.role !== 'assistant' || !message.tokenUsage) continue;

    const {
      promptTokens: prompt,
      completionTokens: completion,
      totalTokens: total,
    } = message.tokenUsage;

    if (prompt !== undefined) {
      promptTokens += prompt;
      hasPromptTokens = true;
    }
    if (completion !== undefined) {
      completionTokens += completion;
      hasCompletionTokens = true;
    }
    if (total !== undefined) {
      totalTokens += total;
      hasTotalTokens = true;
    }
  }

  if (!hasPromptTokens && !hasCompletionTokens && !hasTotalTokens) {
    return null;
  }

  return {
    ...(hasPromptTokens ? { promptTokens } : {}),
    ...(hasCompletionTokens ? { completionTokens } : {}),
    ...(hasTotalTokens ? { totalTokens } : {}),
  };
}
