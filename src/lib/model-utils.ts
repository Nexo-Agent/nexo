/**
 * Utility functions for model capabilities detection
 */

/**
 * Check if a model supports vision/image inputs
 * Based on model name patterns for common vision-capable models
 */
export function isVisionModel(modelName: string | undefined | null): boolean {
  if (!modelName) return false;

  const name = modelName.toLowerCase();

  // OpenAI Vision models
  if (
    name.includes('gpt-4') &&
    (name.includes('vision') ||
      name.includes('turbo') ||
      name.includes('o') ||
      name.includes('0125-preview') ||
      name.includes('1106-preview') ||
      name.includes('2024-04-09') ||
      name.includes('2024-08-06') ||
      name.includes('2024-11-20'))
  ) {
    return true;
  }

  // GPT-4o and GPT-4o-mini (OpenAI's latest vision models)
  if (name.includes('gpt-4o') || name === 'gpt-4o-mini') {
    return true;
  }

  // Claude Vision models (Anthropic)
  if (
    name.includes('claude-3') ||
    name.includes('claude-3-5') ||
    name.includes('claude-3-opus') ||
    name.includes('claude-3-sonnet') ||
    name.includes('claude-3-haiku') ||
    name.includes('claude-3-5-sonnet') ||
    name.includes('claude-3-5-opus')
  ) {
    return true;
  }

  // Gemini Vision models (Google)
  if (
    name.includes('gemini') &&
    (name.includes('vision') ||
      name.includes('pro-vision') ||
      name.includes('1.5') ||
      name.includes('1.0') ||
      name.includes('2.0') ||
      name.includes('flash'))
  ) {
    return true;
  }

  // Ollama vision models (common patterns)
  if (
    name.includes('llava') ||
    name.includes('bakllava') ||
    name.includes('minicpm-v') ||
    name.includes('moondream') ||
    name.includes('vision')
  ) {
    return true;
  }

  return false;
}

/**
 * Get a list of known vision-capable model name patterns
 * Useful for debugging or displaying supported models
 */
export function getVisionModelPatterns(): string[] {
  return [
    'gpt-4-vision',
    'gpt-4-turbo',
    'gpt-4o',
    'gpt-4o-mini',
    'claude-3',
    'claude-3-5',
    'gemini-pro-vision',
    'gemini-1.5',
    'llava',
    'bakllava',
  ];
}
