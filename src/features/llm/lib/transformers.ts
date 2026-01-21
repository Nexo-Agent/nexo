import { logger } from '@/lib/logger';
import type { LLMConnection, LLMModel } from '../types';
import { normalizeProvider } from './provider-utils';

/**
 * Database LLM Connection type (matches Rust struct)
 */
export interface DbLLMConnection {
  id: string;
  name: string;
  base_url: string;
  provider: string;
  api_key: string;
  models_json: string | null;
  default_model: string | null;
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

/**
 * Convert database LLM connection to frontend LLM connection
 * Shared transformation logic used by RTK Query API
 */
export function dbToFrontendLLMConnection(
  dbConn: DbLLMConnection
): LLMConnection {
  let models: LLMModel[] | undefined;
  if (dbConn.models_json) {
    try {
      models = JSON.parse(dbConn.models_json);
    } catch (e) {
      logger.error('Error parsing models_json in LLM connection:', e);
      models = undefined;
    }
  }

  // Normalize provider to ensure it's valid, defaults to 'openai' if invalid
  const provider = normalizeProvider(dbConn.provider);

  return {
    id: dbConn.id,
    name: dbConn.name,
    baseUrl: dbConn.base_url,
    provider,
    apiKey: dbConn.api_key,
    models,
    enabled: dbConn.enabled,
  };
}
