/**
 * Utility functions for LLM connections and model capabilities.
 */

import type { LLMConnection } from '../types';

export {
  canAttachFiles,
  detectModelCapabilities,
  getFileAcceptForCapabilities,
  getFileAcceptForInput,
  isFileAllowedForCapabilities,
  isFileAllowedForInput,
  isVisionModel,
  resolveModelCapabilities,
  supportsAnyFileInput,
  type ModelCapabilities,
  type ModelInputCapabilities,
} from './model-capabilities';

/**
 * Filter LLM connections to only include enabled ones
 */
export function getEnabledLLMConnections(
  connections: LLMConnection[]
): LLMConnection[] {
  return connections.filter((conn) => conn.enabled);
}
