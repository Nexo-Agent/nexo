// Utility to persist and restore chat input settings per workspace

export interface ChatInputSettings {
  selectedModel?: string;
  streamEnabled: boolean;
}

const STORAGE_KEY_PREFIX = 'chat_input_settings_';

export function saveChatInputSettings(
  workspaceId: string,
  settings: ChatInputSettings
): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${workspaceId}`;
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save chat input settings:', error);
  }
}

export function loadChatInputSettings(
  workspaceId: string
): ChatInputSettings | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${workspaceId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as ChatInputSettings;
  } catch (error) {
    console.error('Failed to load chat input settings:', error);
    return null;
  }
}

export function clearChatInputSettings(workspaceId: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${workspaceId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear chat input settings:', error);
  }
}
