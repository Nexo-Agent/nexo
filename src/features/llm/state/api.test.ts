import { describe, it, expect } from 'vitest';
import { llmConnectionsApi } from './api';
import { dbToFrontendLLMConnection } from '../lib/transformers';

describe('llmConnectionsApi', () => {
  it('should have the correct endpoints defined', () => {
    expect(llmConnectionsApi.endpoints.getLLMConnections).toBeDefined();
    expect(llmConnectionsApi.endpoints.createLLMConnection).toBeDefined();
    expect(llmConnectionsApi.endpoints.updateLLMConnection).toBeDefined();
    expect(llmConnectionsApi.endpoints.deleteLLMConnection).toBeDefined();
    expect(
      llmConnectionsApi.endpoints.toggleLLMConnectionEnabled
    ).toBeDefined();
  });

  describe('dbToFrontendLLMConnection', () => {
    it('should correctly transform database connection to frontend connection', () => {
      const mockDbConnection = {
        id: '1',
        name: 'Test LLM',
        base_url: 'https://api.test.com',
        provider: 'google',
        api_key: 'test-key',
        models_json: JSON.stringify([{ id: 'gemini-pro', name: 'Gemini Pro' }]),
        default_model: null,
        enabled: true,
        created_at: 123456789,
        updated_at: 123456789,
      };

      const result = dbToFrontendLLMConnection(mockDbConnection);

      expect(result).toEqual({
        id: '1',
        name: 'Test LLM',
        baseUrl: 'https://api.test.com',
        provider: 'google',
        apiKey: 'test-key',
        models: [{ id: 'gemini-pro', name: 'Gemini Pro' }],
        enabled: true,
      });
    });

    it('should handle missing models_json', () => {
      const mockDbConnection = {
        id: '1',
        name: 'Test LLM',
        base_url: 'https://api.test.com',
        provider: 'openai',
        api_key: 'test-key',
        models_json: null,
        default_model: null,
        enabled: true,
        created_at: 123456789,
        updated_at: 123456789,
      };

      const result = dbToFrontendLLMConnection(mockDbConnection);
      expect(result.models).toBeUndefined();
    });

    it('should default to openai for unknown providers', () => {
      const mockDbConnection = {
        id: '1',
        name: 'Test LLM',
        base_url: 'https://api.test.com',
        provider: 'unknown-provider',
        api_key: 'test-key',
        models_json: null,
        default_model: null,
        enabled: true,
        created_at: 123456789,
        updated_at: 123456789,
      };

      const result = dbToFrontendLLMConnection(mockDbConnection as any); // Cast as any to test runtime validation
      expect(result.provider).toBe('openai');
    });

    it('should correctly transform deepseek and anthropic providers', () => {
      const mockDbConnection1 = {
        id: '1',
        name: 'DeepSeek',
        base_url: 'https://api.deepseek.com',
        provider: 'deepseek',
        api_key: 'test-key',
        models_json: null,
        default_model: null,
        enabled: true,
        created_at: 123456789,
        updated_at: 123456789,
      };
      const mockDbConnection2 = {
        id: '2',
        name: 'Anthropic',
        base_url: 'https://api.anthropic.com',
        provider: 'anthropic',
        api_key: 'test-key',
        models_json: null,
        default_model: null,
        enabled: true,
        created_at: 123456789,
        updated_at: 123456789,
      };

      expect(dbToFrontendLLMConnection(mockDbConnection1 as any).provider).toBe(
        'deepseek'
      );
      expect(dbToFrontendLLMConnection(mockDbConnection2 as any).provider).toBe(
        'anthropic'
      );
    });
  });
});
