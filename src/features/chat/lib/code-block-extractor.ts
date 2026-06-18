import type { CodeBlock } from '@/app/types';

/**
 * Extracts code blocks from markdown content (python, mermaid, and html)
 * Content is not modified, only code blocks are extracted and stored
 * @param content - The markdown content
 * @returns Extracted code blocks with id as index (0, 1, 2, ...)
 */
export function extractCodeBlocks(content: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = [];
  let blockIndex = 0;

  // Regex to match code blocks: ```language\ncode\n```
  // Also handles code blocks without language: ```\ncode\n```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  content.replace(codeBlockRegex, (match, language, code) => {
    const lang = (language || '').toLowerCase().trim();
    const codeContent = code.trim();

    if (
      lang === 'python' ||
      lang === 'mermaid' ||
      lang === 'html' ||
      lang === 'browser'
    ) {
      codeBlocks.push({
        id: String(blockIndex), // Use index as id
        content: codeContent,
        language: lang,
      });
      blockIndex++;
    }

    return match; // Don't modify content
  });

  return codeBlocks;
}
