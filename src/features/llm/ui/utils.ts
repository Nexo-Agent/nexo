/**
 * Helper function to filter popular models for display
 * Used to reduce UI clutter by showing only commonly used models
 */
import type { LLMModel } from '../types';
import {
  POPULAR_OPENAI_MODEL_PATTERNS,
  POPULAR_GOOGLE_MODEL_PATTERNS,
} from '../lib/constants';

export function filterPopularModels(
  models: LLMModel[],
  provider: string
): LLMModel[] {
  if (provider === 'openai') {
    return models.filter((model) => {
      const modelId = model.id.toLowerCase();
      const modelName = model.name.toLowerCase();

      return POPULAR_OPENAI_MODEL_PATTERNS.some(
        (pattern) => modelId === pattern || modelName === pattern
      );
    });
  }

  if (provider === 'google') {
    return models.filter((model) => {
      const modelId = model.id.toLowerCase();
      const modelName = model.name.toLowerCase();

      return POPULAR_GOOGLE_MODEL_PATTERNS.some(
        (pattern) => modelId === pattern || modelName === pattern
      );
    });
  }

  // For other providers, return all models
  return models;
}
