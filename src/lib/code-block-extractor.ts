import type { CodeBlock } from '@/store/types';

/**
 * Extracts code blocks from markdown content (python and mermaid only)
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

  // Extract code blocks (only python and mermaid)
  content.replace(codeBlockRegex, (match, language, code) => {
    const lang = (language || '').toLowerCase().trim();
    const codeContent = code.trim();

    // Only extract python and mermaid blocks
    if (lang === 'python' || lang === 'mermaid') {
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
