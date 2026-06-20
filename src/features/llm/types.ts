export interface LLMModel {
  id: string;
  name: string;
  created?: number;
  owned_by?: string;
  /** @deprecated Use supportsImageInput */
  supportsVision?: boolean;
  supportsImageInput?: boolean;
  supportsDocumentInput?: boolean;
  supportsAudioInput?: boolean;
  supportsVideoInput?: boolean;
  supportsTextExtraction?: boolean;
  supportsTools?: boolean;
  supportsThinking?: boolean;
  supportsImageGeneration?: boolean;
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
  enabled: boolean;
}
