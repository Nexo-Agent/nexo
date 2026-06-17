import { HTML_PREVIEW_FENCE_LANGUAGE } from './constants';

/** Languages that bypass stream smoothing while their fence is open. */
export const STREAM_BYPASS_LANGUAGES = [HTML_PREVIEW_FENCE_LANGUAGE] as const;

const FENCE_OPEN_REGEX = /^```(\w+)?\s*$/;
const FENCE_CLOSE_REGEX = /^```\s*$/;

/**
 * Returns the language of the last unclosed fenced code block, if it matches
 * one of the provided languages. Used to bypass stream smoothing for large previews.
 */
export function findOpenFenceLanguage(
  content: string,
  languages: readonly string[]
): string | null {
  const languageSet = new Set(languages.map((l) => l.toLowerCase()));
  let inFence = false;
  let currentLang: string | null = null;

  for (const line of content.split('\n')) {
    if (!inFence && FENCE_OPEN_REGEX.test(line)) {
      const match = line.match(FENCE_OPEN_REGEX);
      inFence = true;
      currentLang = match?.[1]?.toLowerCase() ?? '';
      continue;
    }

    if (inFence && FENCE_CLOSE_REGEX.test(line)) {
      inFence = false;
      currentLang = null;
    }
  }

  if (inFence && currentLang && languageSet.has(currentLang)) {
    return currentLang;
  }

  return null;
}

export function shouldBypassStreamBuffer(
  content: string,
  isStreaming: boolean
): boolean {
  if (!isStreaming) {
    return false;
  }
  return findOpenFenceLanguage(content, STREAM_BYPASS_LANGUAGES) !== null;
}
