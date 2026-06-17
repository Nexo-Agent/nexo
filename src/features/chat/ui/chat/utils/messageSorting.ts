import type { Message } from '../../../types';

/**
 * Returns assistant message IDs that triggered tool calls (intermediate agent-loop steps).
 * Covers both persisted tool_call messages and in-flight toolCalls on assistant messages.
 */
export function getAssistantMessageIdsWithToolCalls(
  messages: Message[]
): Set<string> {
  const ids = new Set<string>();

  for (const m of messages) {
    if (m.role === 'tool_call' && m.assistantMessageId) {
      ids.add(m.assistantMessageId);
    } else if (m.role === 'assistant' && (m.toolCalls?.length ?? 0) > 0) {
      ids.add(m.id);
    }
  }

  return ids;
}

/**
 * Sorts messages by timestamp and groups tool calls with their parent assistant messages.
 * This ensures the display order: Thinking (part of assistant message) -> Tool Call
 *
 * Logic:
 * 1. Sort all messages by timestamp
 * 2. Index tool calls by assistant message ID for O(1) lookup
 * 3. Build sorted array with tool calls grouped immediately after their assistant messages
 */
export function sortMessages(messages: Message[]): Message[] {
  // 1. Sort all messages by timestamp
  const timestampSorted = [...messages].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  // 2. Index tool calls by assistant message ID for O(1) lookup
  // This avoids O(N^2) complexity from nested filtering
  const toolCallsMap = new Map<string, Message[]>();

  for (const m of timestampSorted) {
    if (m.role === 'tool_call' && m.assistantMessageId) {
      if (!toolCallsMap.has(m.assistantMessageId)) {
        toolCallsMap.set(m.assistantMessageId, []);
      }
      const list = toolCallsMap.get(m.assistantMessageId);
      if (list) {
        list.push(m);
      }
    }
  }

  const sorted: Message[] = [];
  const processedIds = new Set<string>();

  for (const message of timestampSorted) {
    // Skip if already processed (e.g., a tool call already added via its assistant parent)
    if (processedIds.has(message.id)) {
      continue;
    }

    // Add the message itself
    sorted.push(message);
    processedIds.add(message.id);

    // If this is an assistant message, append all its associated tool calls immediately after
    // This ensures Thinking (part of assistant message) -> Tool Call order
    if (message.role === 'assistant') {
      const childToolCalls = toolCallsMap.get(message.id);
      if (childToolCalls) {
        // Tool calls in map are already sorted by timestamp because we iterated timestampSorted
        for (const toolCall of childToolCalls) {
          if (!processedIds.has(toolCall.id)) {
            sorted.push(toolCall);
            processedIds.add(toolCall.id);
          }
        }
      }
    }
  }

  return sorted;
}
