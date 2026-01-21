import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import type { LLMModel } from '../types';
import { filterPopularModels } from '../ui/utils';

export interface UseTestConnectionOptions {
  baseUrl: string;
  apiKey: string;
  provider: string;
  connectionId?: string;
}

export interface UseTestConnectionResult {
  isTesting: boolean;
  testStatus: 'success' | 'error' | null;
  testError: string;
  models: LLMModel[];
  testConnection: () => Promise<LLMModel[] | null>;
}

/**
 * Custom hook for testing LLM connection and fetching models
 * Automatically tests connection when baseUrl, apiKey, or provider changes
 */
export function useTestConnection({
  baseUrl,
  apiKey,
  provider,
  connectionId,
}: UseTestConnectionOptions): UseTestConnectionResult {
  const { t } = useTranslation('settings');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'success' | 'error' | null>(
    null
  );
  const [testError, setTestError] = useState('');
  const [models, setModels] = useState<LLMModel[]>([]);

  const testConnection = useCallback(async () => {
    if (!baseUrl.trim()) {
      setTestError(t('enterBaseUrl'));
      setTestStatus('error');
      return null;
    }

    setIsTesting(true);
    setTestStatus(null);
    setTestError('');

    const startTime = performance.now();

    try {
      const fetchedModels = await invokeCommand<LLMModel[]>(
        TauriCommands.TEST_LLM_CONNECTION,
        {
          baseUrl: baseUrl.trim(),
          provider,
          apiKey: apiKey.trim() || null,
        }
      );

      // Filter popular models for OpenAI and Google providers
      const filteredModels = filterPopularModels(fetchedModels, provider);
      setModels(filteredModels);
      setTestStatus('success');

      // Track successful connection test
      const duration = performance.now() - startTime;
      const { trackConnectionOperation } = await import('@/lib/sentry-utils');
      trackConnectionOperation('llm', 'test', connectionId || 'new', true);

      // Track API call performance
      const { trackAPICall } = await import('@/lib/sentry-utils');
      trackAPICall(baseUrl.trim(), 'GET', duration, true);

      return filteredModels;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t('cannotConnectToAPI');
      setTestError(errorMessage);
      setTestStatus('error');
      setModels([]);

      // Track failed connection test
      const duration = performance.now() - startTime;
      const { trackConnectionOperation, trackAPICall } =
        await import('@/lib/sentry-utils');
      trackConnectionOperation(
        'llm',
        'test',
        connectionId || 'new',
        false,
        errorMessage
      );
      trackAPICall(baseUrl.trim(), 'GET', duration, false);
      return null;
    } finally {
      setIsTesting(false);
    }
  }, [baseUrl, apiKey, provider, connectionId, t]);

  // Auto-test when connection parameters change
  useEffect(() => {
    // Only auto-test if baseUrl is present
    if (!baseUrl.trim()) {
      setTestStatus(null);
      setTestError('');
      setModels([]);
      return;
    }

    const timer = setTimeout(() => {
      void testConnection();
    }, 800); // 800ms debounce to avoid excessive API calls while typing

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, apiKey, provider]); // Only depend on primitive values, testConnection is stable via useCallback

  return {
    isTesting,
    testStatus,
    testError,
    models,
    testConnection,
  };
}
