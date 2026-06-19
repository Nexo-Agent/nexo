import { describe, expect, it } from 'vitest';
import { aggregateConversationTokenUsage } from './tokenUsage';
import type { Message } from '../types';

function assistantMessage(tokenUsage: Message['tokenUsage']): Message {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: 'response',
    timestamp: Date.now(),
    tokenUsage,
  };
}

describe('aggregateConversationTokenUsage', () => {
  it('returns null when no assistant token usage exists', () => {
    expect(aggregateConversationTokenUsage([])).toBeNull();
    expect(
      aggregateConversationTokenUsage([
        {
          id: '1',
          role: 'user',
          content: 'hello',
          timestamp: Date.now(),
        },
      ])
    ).toBeNull();
  });

  it('sums token usage across assistant messages', () => {
    const result = aggregateConversationTokenUsage([
      assistantMessage({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      }),
      assistantMessage({
        promptTokens: 20,
        completionTokens: 8,
        totalTokens: 28,
      }),
    ]);

    expect(result).toEqual({
      promptTokens: 30,
      completionTokens: 13,
      totalTokens: 43,
    });
  });

  it('ignores missing fields on individual messages', () => {
    const result = aggregateConversationTokenUsage([
      assistantMessage({ totalTokens: 15 }),
      assistantMessage({ promptTokens: 20, completionTokens: 8 }),
    ]);

    expect(result).toEqual({
      promptTokens: 20,
      completionTokens: 8,
      totalTokens: 15,
    });
  });
});
