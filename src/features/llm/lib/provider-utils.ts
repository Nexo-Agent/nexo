import type { LLMConnection } from '../types';
import { VALID_PROVIDERS } from './constants';

/**
 * Validates if a provider string is a valid LLM provider
 * @param provider - Provider string to validate
 * @returns true if provider is valid, false otherwise
 */
export function isValidProvider(
  provider: string
): provider is LLMConnection['provider'] {
  return VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number]);
}

/**
 * Normalizes a provider string to a valid provider or returns default
 * @param provider - Provider string to normalize
 * @param defaultProvider - Default provider to use if invalid (default: 'openai')
 * @returns Valid provider string
 */
export function normalizeProvider(
  provider: string,
  defaultProvider: LLMConnection['provider'] = 'openai'
): LLMConnection['provider'] {
  return isValidProvider(provider) ? provider : defaultProvider;
}

/**
 * Checks if a provider requires an API key
 * @param provider - Provider to check
 * @returns true if API key is required
 */
export function requiresApiKey(provider: LLMConnection['provider']): boolean {
  // vLLM and Ollama typically don't require API keys for local deployments
  const optionalApiKeyProviders: LLMConnection['provider'][] = [
    'vllm',
    'ollama',
  ];
  return !optionalApiKeyProviders.includes(provider);
}

/**
 * Gets the display name for a provider
 * @param provider - Provider to get display name for
 * @returns Display name for the provider
 */
export function getProviderDisplayName(
  provider: LLMConnection['provider']
): string {
  const displayNames: Record<LLMConnection['provider'], string> = {
    openai: 'OpenAI',
    google: 'Google Gemini',
    ollama: 'Ollama',
    vllm: 'vLLM',
    litellm: 'LiteLLM',
    fireworks: 'Fireworks AI',
    openrouter: 'OpenRouter',
    groq: 'Groq',
    together: 'Together AI',
    deepinfra: 'DeepInfra',
    anthropic: 'Anthropic Claude',
    deepseek: 'DeepSeek',
  };
  return displayNames[provider] || provider;
}
