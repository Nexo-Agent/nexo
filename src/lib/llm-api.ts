export interface LLMModel {
  id: string;
  name: string;
  created?: number;
  owned_by?: string;
}

/**
 * Fetch models from OpenAI-compatible API
 */
export async function fetchOpenAIModels(
  baseUrl: string,
  apiKey?: string
): Promise<LLMModel[]> {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // OpenAI format: { data: [{ id, created, owned_by }] }
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.id,
        created: model.created,
        owned_by: model.owned_by,
      }));
    }

    // Some APIs return array directly
    if (Array.isArray(data)) {
      return data.map((model: any) => ({
        id: model.id || model.name,
        name: model.id || model.name,
        created: model.created,
        owned_by: model.owned_by,
      }));
    }

    throw new Error("Unexpected response format");
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    throw error;
  }
}

/**
 * Fetch models from Ollama API
 */
export async function fetchOllamaModels(
  baseUrl: string
): Promise<LLMModel[]> {
  try {
    // Ollama uses /api/tags endpoint
    const ollamaBaseUrl = baseUrl.replace("/v1", "");
    const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Ollama format: { models: [{ name, modified_at, size, ... }] }
    if (data.models && Array.isArray(data.models)) {
      return data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
      }));
    }

    throw new Error("Unexpected response format");
  } catch (error) {
    console.error("Error fetching Ollama models:", error);
    throw error;
  }
}

/**
 * Test connection and fetch models
 */
export async function testConnectionAndFetchModels(
  baseUrl: string,
  provider: "openai" | "ollama",
  apiKey?: string
): Promise<LLMModel[]> {
  if (provider === "openai") {
    return fetchOpenAIModels(baseUrl, apiKey);
  } else {
    return fetchOllamaModels(baseUrl);
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  content: string;
  finish_reason?: string;
}

/**
 * Send chat completion request to OpenAI-compatible API
 */
export async function sendOpenAIChatCompletion(
  baseUrl: string,
  options: ChatCompletionOptions,
  apiKey?: string,
  onChunk?: (chunk: string) => void
): Promise<ChatCompletionResponse> {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const requestBody = {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: options.stream ?? false,
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `HTTP error! status: ${response.status}`
      );
    }

    if (options.stream) {
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return { content: fullContent };
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                onChunk?.(delta);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      return { content: fullContent };
    } else {
      // Handle non-streaming response
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const finishReason = data.choices?.[0]?.finish_reason;

      return {
        content,
        finish_reason: finishReason,
      };
    }
  } catch (error) {
    console.error("Error sending OpenAI chat completion:", error);
    throw error;
  }
}

/**
 * Send chat completion request to Ollama API
 */
export async function sendOllamaChatCompletion(
  baseUrl: string,
  options: ChatCompletionOptions,
  onChunk?: (chunk: string) => void
): Promise<ChatCompletionResponse> {
  try {
    // Ollama uses /api/chat endpoint (not /v1/chat/completions)
    const ollamaBaseUrl = baseUrl.replace("/v1", "");
    const requestBody = {
      model: options.model,
      messages: options.messages,
      stream: options.stream ?? false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.max_tokens,
      },
    };

    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    if (options.stream) {
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              const delta = parsed.message?.content;
              if (delta) {
                fullContent += delta;
                onChunk?.(delta);
              }
              if (parsed.done) {
                return { content: fullContent };
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      return { content: fullContent };
    } else {
      // Handle non-streaming response
      const data = await response.json();
      const content = data.message?.content || "";

      return {
        content,
      };
    }
  } catch (error) {
    console.error("Error sending Ollama chat completion:", error);
    throw error;
  }
}

/**
 * Send chat completion request (supports both OpenAI and Ollama)
 */
export async function sendChatCompletion(
  baseUrl: string,
  provider: "openai" | "ollama",
  options: ChatCompletionOptions,
  apiKey?: string,
  onChunk?: (chunk: string) => void
): Promise<ChatCompletionResponse> {
  if (provider === "openai") {
    return sendOpenAIChatCompletion(baseUrl, options, apiKey, onChunk);
  } else {
    return sendOllamaChatCompletion(baseUrl, options, onChunk);
  }
}

