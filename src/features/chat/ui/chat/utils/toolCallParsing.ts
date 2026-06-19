import type { ToolCallData } from '../ToolCallItem';

export function parseToolCallContent(content: string): ToolCallData | null {
  try {
    const parsed = JSON.parse(content) as {
      name?: string;
      arguments?: unknown;
      status?: string;
      result?: unknown;
      error?: string;
    };

    if (!parsed.name || !parsed.status) return null;

    return {
      id: parsed.name,
      name: parsed.name,
      arguments: parsed.arguments ?? {},
      status: parsed.status,
      result: parsed.result,
      error: parsed.error,
    };
  } catch {
    return null;
  }
}

export function parseToolCallMessage(
  message: { id: string; content: string } | undefined,
  data?: ToolCallData
): ToolCallData | null {
  if (data) {
    return data;
  }
  if (!message) return null;
  const parsed = parseToolCallContent(message.content);
  if (!parsed) return null;
  return { ...parsed, id: message.id };
}
