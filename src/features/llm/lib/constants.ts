import type { LLMConnection } from '../types';

/**
 * Default base URLs for different LLM providers
 */
export const DEFAULT_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  ollama: 'http://localhost:11434/v1',
  vllm: 'http://localhost:8000/v1',
  litellm: 'http://0.0.0.0:4000',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  together: 'https://api.together.xyz/v1',
  deepinfra: 'https://api.deepinfra.com/v1/openai',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  anthropic: 'https://api.anthropic.com',
  deepseek: 'https://api.deepseek.com',
} as const;

/**
 * Valid LLM provider types
 */
export const VALID_PROVIDERS = [
  'openai',
  'ollama',
  'vllm',
  'litellm',
  'fireworks',
  'openrouter',
  'groq',
  'together',
  'deepinfra',
  'google',
  'anthropic',
  'deepseek',
] as const;

/**
 * Provider options for UI select dropdown
 */
export const PROVIDER_OPTIONS: {
  value: LLMConnection['provider'];
  label: string;
}[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google Gemini' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'vllm', label: 'vLLM' },
  { value: 'litellm', label: 'LiteLLM' },
  { value: 'fireworks', label: 'Fireworks AI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'groq', label: 'Groq' },
  { value: 'together', label: 'Together AI' },
  { value: 'deepinfra', label: 'DeepInfra' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'deepseek', label: 'DeepSeek' },
] as const;

/**
 * Popular OpenAI model patterns for filtering
 */
export const POPULAR_OPENAI_MODEL_PATTERNS = [
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-5',
  'o1',
  'gpt-5.1',
] as const;

/**
 * Popular Google Gemini model patterns for filtering
 */
export const POPULAR_GOOGLE_MODEL_PATTERNS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
] as const;
