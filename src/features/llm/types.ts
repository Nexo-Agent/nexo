export interface LLMModel {
  id: string;
  name: string;
  created?: number;
  owned_by?: string;
  supportsTools: boolean;
  supportsThinking: boolean;
}

export interface LLMConnection {
  id: string;
  name: string;
  baseUrl: string;
  provider:
    | 'openai'
    | 'ollama'
    | 'vllm'
    | 'litellm'
    | 'fireworks'
    | 'openrouter'
    | 'groq'
    | 'together'
    | 'deepinfra'
    | 'google'
    | 'anthropic'
    | 'deepseek';
  apiKey: string;
  models?: LLMModel[];
}
