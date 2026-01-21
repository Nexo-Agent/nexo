import { useState } from 'react';
import type { LLMConnection } from '../types';
import { DEFAULT_URLS } from '../lib/constants';

export interface UseLLMConnectionFormOptions {
  connection: LLMConnection | null;
}

export interface UseLLMConnectionFormResult {
  name: string;
  setName: (name: string) => void;
  provider: LLMConnection['provider'];
  setProvider: (provider: LLMConnection['provider']) => void;
  baseUrl: string;
  setBaseUrl: (baseUrl: string) => void;
  apiKey: string;
  setApiKey: (apiKey: string) => void;
  handleProviderChange: (newProvider: LLMConnection['provider']) => void;
  isValid: boolean;
}

/**
 * Custom hook for managing LLM connection form state
 * Handles form field state and provider-specific logic
 */
export function useLLMConnectionForm({
  connection,
}: UseLLMConnectionFormOptions): UseLLMConnectionFormResult {
  // Initialize state from connection or defaults
  const [name, setName] = useState(connection?.name || '');
  const [provider, setProvider] = useState<LLMConnection['provider']>(
    connection?.provider || 'openai'
  );
  const [baseUrl, setBaseUrl] = useState(
    connection?.baseUrl || DEFAULT_URLS[connection?.provider || 'openai'] || ''
  );
  const [apiKey, setApiKey] = useState(connection?.apiKey || '');

  /**
   * Handle provider change with automatic baseUrl update
   * Only updates baseUrl if it matches the previous provider's default
   */
  const handleProviderChange = (newProvider: LLMConnection['provider']) => {
    setProvider(newProvider);

    // Auto-update baseUrl if it's still the default for current provider
    if (!baseUrl || baseUrl === DEFAULT_URLS[provider]) {
      setBaseUrl(DEFAULT_URLS[newProvider]);
    }
  };

  // Form validation
  const isValid = name.trim().length > 0 && baseUrl.trim().length > 0;

  return {
    name,
    setName,
    provider,
    setProvider,
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    handleProviderChange,
    isValid,
  };
}
