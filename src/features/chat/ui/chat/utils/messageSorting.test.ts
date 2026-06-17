import { describe, it, expect } from 'vitest';
import {
  getAssistantMessageIdsWithToolCalls,
  sortMessages,
} from './messageSorting';
import type { Message } from '../../../types';

describe('getAssistantMessageIdsWithToolCalls', () => {
  it('should include assistant messages linked to tool_call messages', () => {
    const messages: Message[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Thinking',
        timestamp: 1000,
      },
      {
        id: 'tool-call-1',
        role: 'tool_call',
        content: '{"name":"search"}',
        timestamp: 1100,
        assistantMessageId: 'assistant-1',
      },
      {
        id: 'assistant-2',
        role: 'assistant',
        content: 'Final answer',
        timestamp: 2000,
      },
    ];

    const ids = getAssistantMessageIdsWithToolCalls(messages);

    expect(ids.has('assistant-1')).toBe(true);
    expect(ids.has('assistant-2')).toBe(false);
  });

  it('should include assistant messages with in-flight toolCalls', () => {
    const messages: Message[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: '',
        timestamp: 1000,
        toolCalls: [{ id: 'tc-1', name: 'search', arguments: {} }],
      },
    ];

    const ids = getAssistantMessageIdsWithToolCalls(messages);

    expect(ids.has('assistant-1')).toBe(true);
  });
});

describe('sortMessages', () => {
  it('should sort messages by timestamp', () => {
    const messages: Message[] = [
      {
        id: '3',
        role: 'user',
        content: 'Third',
        timestamp: 3000,
      },
      {
        id: '1',
        role: 'user',
        content: 'First',
        timestamp: 1000,
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Second',
        timestamp: 2000,
      },
    ];

    const sorted = sortMessages(messages);

    expect(sorted).toHaveLength(3);
    expect(sorted[0].id).toBe('1');
    expect(sorted[1].id).toBe('2');
    expect(sorted[2].id).toBe('3');
  });

  it('should group tool calls with their assistant messages', () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'Question',
        timestamp: 1000,
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Let me check',
        timestamp: 2000,
      },
      {
        id: 'tool-call-1',
        role: 'tool_call',
        content: '{"name":"search"}',
        timestamp: 2100,
        assistantMessageId: 'assistant-1',
      },
      {
        id: 'user-2',
        role: 'user',
        content: 'Another question',
        timestamp: 3000,
      },
    ];

    const sorted = sortMessages(messages);

    expect(sorted).toHaveLength(4);
    expect(sorted[0].id).toBe('user-1');
    expect(sorted[1].id).toBe('assistant-1');
    expect(sorted[2].id).toBe('tool-call-1'); // Tool call grouped with assistant
    expect(sorted[3].id).toBe('user-2');
  });

  it('should handle multiple tool calls for same assistant message', () => {
    const messages: Message[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Processing',
        timestamp: 1000,
      },
      {
        id: 'tool-call-1',
        role: 'tool_call',
        content: '{"name":"tool1"}',
        timestamp: 1100,
        assistantMessageId: 'assistant-1',
      },
      {
        id: 'tool-call-2',
        role: 'tool_call',
        content: '{"name":"tool2"}',
        timestamp: 1200,
        assistantMessageId: 'assistant-1',
      },
      {
        id: 'tool-call-3',
        role: 'tool_call',
        content: '{"name":"tool3"}',
        timestamp: 1300,
        assistantMessageId: 'assistant-1',
      },
    ];

    const sorted = sortMessages(messages);

    expect(sorted).toHaveLength(4);
    expect(sorted[0].id).toBe('assistant-1');
    expect(sorted[1].id).toBe('tool-call-1');
    expect(sorted[2].id).toBe('tool-call-2');
    expect(sorted[3].id).toBe('tool-call-3');
  });

  it('should handle tool calls without assistantMessageId', () => {
    const messages: Message[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Response',
        timestamp: 1000,
      },
      {
        id: 'tool-call-orphan',
        role: 'tool_call',
        content: '{"name":"orphan"}',
        timestamp: 1100,
        // No assistantMessageId
      },
    ];

    const sorted = sortMessages(messages);

    expect(sorted).toHaveLength(2);
    expect(sorted[0].id).toBe('assistant-1');
    expect(sorted[1].id).toBe('tool-call-orphan');
  });

  it('should handle empty message array', () => {
    const sorted = sortMessages([]);
    expect(sorted).toHaveLength(0);
  });

  it('should handle messages without tool calls', () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'Hello',
        timestamp: 1000,
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Hi',
        timestamp: 2000,
      },
      {
        id: 'user-2',
        role: 'user',
        content: 'How are you?',
        timestamp: 3000,
      },
    ];

    const sorted = sortMessages(messages);

    expect(sorted).toHaveLength(3);
    expect(sorted[0].id).toBe('user-1');
    expect(sorted[1].id).toBe('assistant-1');
    expect(sorted[2].id).toBe('user-2');
  });

  it('should maintain tool call order by timestamp', () => {
    const messages: Message[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Processing',
        timestamp: 1000,
      },
      {
        id: 'tool-call-3',
        role: 'tool_call',
        content: '{"name":"tool3"}',
        timestamp: 1300,
        assistantMessageId: 'assistant-1',
      },
      {
        id: 'tool-call-1',
        role: 'tool_call',
        content: '{"name":"tool1"}',
        timestamp: 1100,
        assistantMessageId: 'assistant-1',
      },
      {
        id: 'tool-call-2',
        role: 'tool_call',
        content: '{"name":"tool2"}',
        timestamp: 1200,
        assistantMessageId: 'assistant-1',
      },
    ];

    const sorted = sortMessages(messages);

    expect(sorted).toHaveLength(4);
    expect(sorted[0].id).toBe('assistant-1');
    expect(sorted[1].id).toBe('tool-call-1'); // Sorted by timestamp
    expect(sorted[2].id).toBe('tool-call-2');
    expect(sorted[3].id).toBe('tool-call-3');
  });

  it('should handle multiple assistant messages with their own tool calls', () => {
    const messages: Message[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'First',
        timestamp: 1000,
      },
      {
        id: 'tool-call-1a',
        role: 'tool_call',
        content: '{"name":"tool1a"}',
        timestamp: 1100,
        assistantMessageId: 'assistant-1',
      },
      {
        id: 'assistant-2',
        role: 'assistant',
        content: 'Second',
        timestamp: 2000,
      },
      {
        id: 'tool-call-2a',
        role: 'tool_call',
        content: '{"name":"tool2a"}',
        timestamp: 2100,
        assistantMessageId: 'assistant-2',
      },
      {
        id: 'tool-call-2b',
        role: 'tool_call',
        content: '{"name":"tool2b"}',
        timestamp: 2200,
        assistantMessageId: 'assistant-2',
      },
    ];

    const sorted = sortMessages(messages);

    expect(sorted).toHaveLength(5);
    expect(sorted[0].id).toBe('assistant-1');
    expect(sorted[1].id).toBe('tool-call-1a');
    expect(sorted[2].id).toBe('assistant-2');
    expect(sorted[3].id).toBe('tool-call-2a');
    expect(sorted[4].id).toBe('tool-call-2b');
  });

  it('should not duplicate messages', () => {
    const messages: Message[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Response',
        timestamp: 1000,
      },
      {
        id: 'tool-call-1',
        role: 'tool_call',
        content: '{"name":"tool1"}',
        timestamp: 1100,
        assistantMessageId: 'assistant-1',
      },
    ];

    const sorted = sortMessages(messages);

    expect(sorted).toHaveLength(2);
    const ids = sorted.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(2);
  });

  it('should handle tool messages (not tool_call)', () => {
    const messages: Message[] = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Response',
        timestamp: 1000,
      },
      {
        id: 'tool-1',
        role: 'tool',
        content: 'Tool result',
        timestamp: 1100,
      },
    ];

    const sorted = sortMessages(messages);

    expect(sorted).toHaveLength(2);
    expect(sorted[0].id).toBe('assistant-1');
    expect(sorted[1].id).toBe('tool-1');
  });

  it('should preserve original messages array', () => {
    const messages: Message[] = [
      {
        id: '2',
        role: 'user',
        content: 'Second',
        timestamp: 2000,
      },
      {
        id: '1',
        role: 'user',
        content: 'First',
        timestamp: 1000,
      },
    ];

    const originalOrder = messages.map((m) => m.id);
    sortMessages(messages);

    expect(messages.map((m) => m.id)).toEqual(originalOrder);
  });

  it('should handle complex conversation flow', () => {
    const messages: Message[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'Question 1',
        timestamp: 1000,
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Thinking...',
        reasoning: 'Let me search',
        timestamp: 2000,
      },
      {
        id: 'tool-call-1',
        role: 'tool_call',
        content: '{"name":"search"}',
        timestamp: 2100,
        assistantMessageId: 'assistant-1',
      },
      {
        id: 'user-2',
        role: 'user',
        content: 'Question 2',
        timestamp: 3000,
      },
      {
        id: 'assistant-2',
        role: 'assistant',
        content: 'Answer',
        timestamp: 4000,
      },
    ];

    const sorted = sortMessages(messages);

    expect(sorted).toHaveLength(5);
    expect(sorted[0].id).toBe('user-1');
    expect(sorted[1].id).toBe('assistant-1');
    expect(sorted[2].id).toBe('tool-call-1');
    expect(sorted[3].id).toBe('user-2');
    expect(sorted[4].id).toBe('assistant-2');
  });
});
