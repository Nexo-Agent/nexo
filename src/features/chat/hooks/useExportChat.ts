import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import * as opener from '@tauri-apps/plugin-opener';
import type { Message } from '@/app/types';
import { logger } from '@/lib/logger';

export function useExportChat() {
  const exportFile = async (
    content: string,
    filename: string,
    extension: string,
    mimeType: string
  ) => {
    // Check if running in Tauri environment
    const isTauri = '__TAURI_INTERNALS__' in window;

    if (isTauri) {
      try {
        const filePath = await save({
          defaultPath: filename,
          filters: [
            {
              name: extension.toUpperCase(),
              extensions: [extension],
            },
          ],
        });

        if (filePath) {
          await writeTextFile(filePath, content);
          await opener.openPath(filePath);
        }
        return;
      } catch (error) {
        logger.error(
          'Tauri export failed, falling back to browser download',
          error
        );
      }
    }

    // Fallback for browser or failed Tauri export
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = (chatId: string, messages: Message[]) => {
    const markdown = messages
      .map((m) => {
        const role = m.role === 'user' ? '**You**' : '**Assistant**';
        const timestamp = new Date(m.timestamp).toLocaleString();
        return `### ${role} (${timestamp})\n\n${m.content}\n\n---\n`;
      })
      .join('\n');

    exportFile(markdown, `chat-${chatId}.md`, 'md', 'text/markdown');
  };

  const handleExportJSON = (chatId: string, messages: Message[]) => {
    const data = {
      chatId,
      exportedAt: new Date().toISOString(),
      messages,
    };
    const json = JSON.stringify(data, null, 2);
    exportFile(json, `chat-${chatId}.json`, 'json', 'application/json');
  };

  return {
    handleExportMarkdown,
    handleExportJSON,
  };
}
