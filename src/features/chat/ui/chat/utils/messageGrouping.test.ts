import { describe, expect, it } from 'vitest';
import type { Message } from '../../../types';
import { buildMessageRenderUnits, summarizeActivity } from './messageGrouping';

function assistant(
  id: string,
  content: string,
  timestamp: number,
  reasoning?: string
): Message {
  return {
    id,
    role: 'assistant',
    content,
    reasoning,
    timestamp,
  };
}

function user(id: string, content: string, timestamp: number): Message {
  return {
    id,
    role: 'user',
    content,
    timestamp,
  };
}

function toolCall(
  id: string,
  assistantMessageId: string,
  name: string,
  timestamp: number,
  status = 'completed'
): Message {
  return {
    id,
    role: 'tool_call',
    content: JSON.stringify({
      name,
      arguments: { path: '/tmp' },
      status,
    }),
    assistantMessageId,
    timestamp,
  };
}

describe('buildMessageRenderUnits', () => {
  it('groups agent loop into a single assistant turn with collapsed activity', () => {
    const messages = [
      user('u1', 'Hello', 1),
      assistant('a1', 'Let me check.', 2, 'Need to read file'),
      toolCall('t1', 'a1', 'read_file', 3),
      assistant('a2', 'The file says hi.', 4),
    ];

    const units = buildMessageRenderUnits(messages);

    expect(units).toHaveLength(2);
    expect(units[0].kind).toBe('user');
    expect(units[1].kind).toBe('assistant_turn');

    if (units[1].kind !== 'assistant_turn') return;

    expect(units[1].message.id).toBe('a2');
    expect(units[1].message.content).toBe('The file says hi.');
    expect(units[1].activity?.steps.map((step) => step.kind)).toEqual([
      'thinking',
      'snippet',
      'tool',
    ]);
    expect(units[1].activity?.defaultExpanded).toBe(false);
  });

  it('keeps simple assistant reply without activity block', () => {
    const messages = [user('u1', 'Hi', 1), assistant('a1', 'Hello!', 2)];

    const units = buildMessageRenderUnits(messages);

    expect(units).toHaveLength(2);
    if (units[1].kind !== 'assistant_turn') return;
    expect(units[1].activity).toBeNull();
  });

  it('expands activity while streaming thinking on the final assistant', () => {
    const messages = [assistant('a1', '', 1, 'Still thinking...')];

    const units = buildMessageRenderUnits(messages, {
      streamingMessageId: 'a1',
    });

    if (units[0].kind !== 'assistant_turn') return;
    expect(units[0].activity?.defaultExpanded).toBe(true);
    expect(units[0].activity?.steps[0].kind).toBe('thinking');
  });

  it('shows thinking placeholder while assistant is streaming without reasoning content yet', () => {
    const messages = [assistant('a1', '', 1)];

    const units = buildMessageRenderUnits(messages, {
      streamingMessageId: 'a1',
    });

    if (units[0].kind !== 'assistant_turn') return;
    expect(units[0].activity?.steps[0]).toMatchObject({
      kind: 'thinking',
      content: '',
      isStreaming: true,
    });
    expect(units[0].activity?.defaultExpanded).toBe(true);
  });

  it('does not duplicate final assistant content in activity', () => {
    const messages = [
      assistant('a1', 'Done', 1, 'Reasoned briefly'),
      toolCall('t1', 'a1', 'grep', 2),
    ];

    const units = buildMessageRenderUnits(messages);
    if (units[0].kind !== 'assistant_turn') return;

    const kinds = units[0].activity?.steps.map((step) => step.kind) ?? [];
    expect(kinds).not.toContain('snippet');
    expect(kinds).toEqual(['thinking', 'tool']);
  });

  it('shows tool placeholder as soon as tool calls are detected', () => {
    const messages = [
      assistant('a1', '', 1, undefined),
      {
        id: 'a2',
        role: 'assistant' as const,
        content: 'Done',
        timestamp: 2,
        toolCalls: [
          {
            id: 'call-1',
            name: 'create_artifact',
            arguments: { name: 'demo' },
          },
        ],
      },
    ];

    const units = buildMessageRenderUnits(messages);
    if (units[0].kind !== 'assistant_turn') return;

    const toolStep = units[0].activity?.steps.find(
      (step) => step.kind === 'tool'
    );
    expect(toolStep).toMatchObject({
      kind: 'tool',
      data: {
        id: 'call-1',
        name: 'create_artifact',
        status: 'calling',
      },
    });
  });
});

describe('summarizeActivity', () => {
  it('summarizes thoughts and tools', () => {
    const summary = summarizeActivity([
      {
        kind: 'thinking',
        id: '1',
        messageId: 'a1',
        content: 'x',
        isStreaming: false,
      },
      {
        kind: 'tool',
        id: 't1',
        data: {
          id: 't1',
          name: 'read_file',
          arguments: {},
          status: 'completed',
        },
      },
      {
        kind: 'tool',
        id: 't2',
        data: {
          id: 't2',
          name: 'grep',
          arguments: {},
          status: 'completed',
        },
      },
    ]);

    expect(summary).toContain('1 thought');
    expect(summary).toContain('2 tools');
    expect(summary).toContain('read_file');
  });
});
