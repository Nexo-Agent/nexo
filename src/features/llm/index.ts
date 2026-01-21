// Types
export type { LLMModel, LLMConnection } from './types';

// RTK Query API
export { llmConnectionsApi } from './state/api';

// RTK Query Hooks
export {
  useGetLLMConnectionsQuery,
  useCreateLLMConnectionMutation,
  useUpdateLLMConnectionMutation,
  useDeleteLLMConnectionMutation,
  useToggleLLMConnectionEnabledMutation,
} from './state/api';

// UI Components
export { LLMConnections } from './ui/LLMConnections';

// Utilities - Model Utils
export {
  getEnabledLLMConnections,
  isVisionModel,
  getVisionModelPatterns,
} from './lib';

// Utilities - Constants
export {
  DEFAULT_URLS,
  VALID_PROVIDERS,
  PROVIDER_OPTIONS,
  POPULAR_OPENAI_MODEL_PATTERNS,
  POPULAR_GOOGLE_MODEL_PATTERNS,
} from './lib';

// Utilities - Transformers
export { dbToFrontendLLMConnection, type DbLLMConnection } from './lib';
