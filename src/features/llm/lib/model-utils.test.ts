import { describe, it, expect } from 'vitest';
import {
  getEnabledLLMConnections,
  isVisionModel,
  detectModelCapabilities,
  resolveModelCapabilities,
  supportsAnyFileInput,
  canAttachFiles,
  getFileAcceptForCapabilities,
  isFileAllowedForCapabilities,
} from './model-utils';
import type { LLMConnection, LLMModel } from '../types';

describe('model-utils', () => {
  describe('getEnabledLLMConnections', () => {
    it('should filter only enabled connections', () => {
      const connections: LLMConnection[] = [
        {
          id: '1',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com',
          provider: 'openai',
          apiKey: 'key1',
          enabled: true,
          models: [],
        },
        {
          id: '2',
          name: 'Anthropic',
          baseUrl: 'https://api.anthropic.com',
          provider: 'anthropic',
          apiKey: 'key2',
          enabled: false,
          models: [],
        },
        {
          id: '3',
          name: 'Google',
          baseUrl: 'https://api.google.com',
          provider: 'google',
          apiKey: 'key3',
          enabled: true,
          models: [],
        },
      ];

      const enabled = getEnabledLLMConnections(connections);

      expect(enabled).toHaveLength(2);
      expect(enabled[0].id).toBe('1');
      expect(enabled[1].id).toBe('3');
    });

    it('should return empty array if no connections enabled', () => {
      const connections: LLMConnection[] = [
        {
          id: '1',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com',
          provider: 'openai',
          apiKey: 'key1',
          enabled: false,
          models: [],
        },
      ];

      expect(getEnabledLLMConnections(connections)).toHaveLength(0);
    });
  });

  describe('detectModelCapabilities', () => {
    describe('OpenAI models', () => {
      it('detects GPT-4o image, document, and tools', () => {
        const caps = detectModelCapabilities('gpt-4o');
        expect(caps.input.image).toBe(true);
        expect(caps.input.document).toBe(true);
        expect(caps.tools).toBe(true);
        expect(caps.thinking).toBe(false);
        expect(caps.imageGeneration).toBe(false);
      });

      it('detects GPT-4.1 document without image', () => {
        const caps = detectModelCapabilities('gpt-4.1');
        expect(caps.input.image).toBe(false);
        expect(caps.input.document).toBe(true);
        expect(caps.tools).toBe(true);
      });

      it('detects GPT-5 thinking', () => {
        const caps = detectModelCapabilities('gpt-5.5');
        expect(caps.input.image).toBe(true);
        expect(caps.input.document).toBe(true);
        expect(caps.thinking).toBe(true);
      });

      it('detects DALL-E as image generation only', () => {
        const caps = detectModelCapabilities('dall-e-3');
        expect(caps.imageGeneration).toBe(true);
        expect(caps.tools).toBe(false);
        expect(caps.thinking).toBe(false);
        expect(caps.input.document).toBe(false);
      });

      it('does not treat plain gpt-4 as image input', () => {
        expect(detectModelCapabilities('gpt-4').input.image).toBe(false);
        expect(detectModelCapabilities('gpt-4').input.document).toBe(true);
      });
    });

    describe('Anthropic models', () => {
      it('detects Claude Opus 4.8 capabilities', () => {
        const caps = detectModelCapabilities('claude-opus-4-8');
        expect(caps.input.image).toBe(true);
        expect(caps.input.document).toBe(true);
        expect(caps.tools).toBe(true);
        expect(caps.thinking).toBe(true);
      });

      it('does not detect claude-2', () => {
        const caps = detectModelCapabilities('claude-2');
        expect(caps.input.image).toBe(false);
        expect(caps.input.document).toBe(false);
        expect(caps.tools).toBe(false);
      });
    });

    describe('Google Gemini models', () => {
      it('detects gemini 2.5 flash thinking with audio/video', () => {
        const caps = detectModelCapabilities('gemini-2.5-flash');
        expect(caps.input.image).toBe(true);
        expect(caps.input.document).toBe(true);
        expect(caps.input.audio).toBe(true);
        expect(caps.input.video).toBe(true);
        expect(caps.tools).toBe(true);
        expect(caps.thinking).toBe(true);
      });

      it('detects gemini image models', () => {
        const caps = detectModelCapabilities('gemini-2.5-flash-image');
        expect(caps.imageGeneration).toBe(true);
        expect(caps.tools).toBe(false);
        expect(caps.input.document).toBe(false);
      });
    });

    describe('Local vision models', () => {
      it('detects llava image-only and qwen-vl', () => {
        expect(detectModelCapabilities('llava:7b').input.image).toBe(true);
        expect(detectModelCapabilities('llava:7b').input.document).toBe(false);
        expect(detectModelCapabilities('qwen2.5-vl:7b').input.image).toBe(true);
        expect(detectModelCapabilities('qwen2.5-vl:7b').input.document).toBe(
          false
        );
      });
    });

    describe('DeepSeek', () => {
      it('detects deepseek v4 without file input but with text extraction', () => {
        const caps = detectModelCapabilities('deepseek-v4-pro');
        expect(caps.input.image).toBe(false);
        expect(caps.input.document).toBe(false);
        expect(caps.tools).toBe(true);
        expect(caps.thinking).toBe(true);
        expect(caps.textExtraction).toBe(true);
      });
    });

    describe('Text extraction', () => {
      it('enables text extraction when native document is unavailable', () => {
        expect(detectModelCapabilities('deepseek-v4-pro').textExtraction).toBe(
          true
        );
        expect(detectModelCapabilities('llava:7b').textExtraction).toBe(true);
      });

      it('disables text extraction when native document is supported', () => {
        expect(detectModelCapabilities('gpt-4o').textExtraction).toBe(false);
        expect(detectModelCapabilities('gpt-4.1').textExtraction).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('returns false for null, undefined, empty', () => {
        expect(detectModelCapabilities(null).input.image).toBe(false);
        expect(detectModelCapabilities(undefined).input.image).toBe(false);
        expect(detectModelCapabilities('').input.image).toBe(false);
      });

      it('strips openrouter prefix', () => {
        const caps = detectModelCapabilities(
          'openrouter/anthropic/claude-opus-4-8'
        );
        expect(caps.thinking).toBe(true);
      });
    });
  });

  describe('canAttachFiles', () => {
    it('allows attach when native input or text extraction is available', () => {
      expect(
        canAttachFiles({
          input: { image: false, document: false, audio: false, video: false },
          tools: true,
          thinking: true,
          imageGeneration: false,
          textExtraction: true,
        })
      ).toBe(true);
      expect(
        canAttachFiles({
          input: { image: true, document: false, audio: false, video: false },
          tools: true,
          thinking: false,
          imageGeneration: false,
          textExtraction: false,
        })
      ).toBe(true);
      expect(
        canAttachFiles({
          input: { image: false, document: false, audio: false, video: false },
          tools: true,
          thinking: false,
          imageGeneration: false,
          textExtraction: false,
        })
      ).toBe(false);
    });
  });

  describe('file gate for extract-only models', () => {
    const deepseekCaps = detectModelCapabilities('deepseek-v4-pro');
    const gpt4oCaps = detectModelCapabilities('gpt-4o');
    const llavaCaps = detectModelCapabilities('llava:7b');

    it('accepts extractable types for deepseek', () => {
      expect(getFileAcceptForCapabilities(deepseekCaps)).toContain(
        'application/pdf'
      );
      expect(getFileAcceptForCapabilities(deepseekCaps)).toContain(
        'application/json'
      );
      expect(
        isFileAllowedForCapabilities(
          new File(['{}'], 'config.json', { type: 'application/json' }),
          deepseekCaps
        )
      ).toBe(true);
      expect(
        isFileAllowedForCapabilities(
          new File(['{}'], 'config.json', { type: '' }),
          deepseekCaps
        )
      ).toBe(true);
      expect(
        isFileAllowedForCapabilities(
          new File(['x'], 'report.pdf', { type: 'application/pdf' }),
          deepseekCaps
        )
      ).toBe(true);
      expect(
        isFileAllowedForCapabilities(
          new File(['x'], 'photo.png', { type: 'image/png' }),
          deepseekCaps
        )
      ).toBe(false);
    });

    it('uses native document accept for gpt-4o', () => {
      expect(gpt4oCaps.textExtraction).toBe(false);
      expect(
        isFileAllowedForCapabilities(
          new File(['x'], 'report.pdf', { type: 'application/pdf' }),
          gpt4oCaps
        )
      ).toBe(true);
    });

    it('allows hybrid image native + pdf extract for llava', () => {
      expect(
        isFileAllowedForCapabilities(
          new File(['x'], 'photo.png', { type: 'image/png' }),
          llavaCaps
        )
      ).toBe(true);
      expect(
        isFileAllowedForCapabilities(
          new File(['x'], 'report.pdf', { type: 'application/pdf' }),
          llavaCaps
        )
      ).toBe(true);
    });
  });

  describe('supportsAnyFileInput', () => {
    it('returns true when any input modality is supported', () => {
      expect(
        supportsAnyFileInput({
          image: true,
          document: false,
          audio: false,
          video: false,
        })
      ).toBe(true);
      expect(
        supportsAnyFileInput({
          image: false,
          document: true,
          audio: false,
          video: false,
        })
      ).toBe(true);
      expect(
        supportsAnyFileInput({
          image: false,
          document: false,
          audio: false,
          video: false,
        })
      ).toBe(false);
    });
  });

  describe('isVisionModel', () => {
    it('delegates to detectModelCapabilities image input', () => {
      expect(isVisionModel('gpt-4o')).toBe(true);
      expect(isVisionModel('gpt-3.5-turbo')).toBe(false);
      expect(isVisionModel('gpt-4.1')).toBe(false);
    });
  });

  describe('resolveModelCapabilities', () => {
    it('prefers backend flags when present', () => {
      const model: LLMModel = {
        id: 'custom-model',
        name: 'Custom',
        supportsImageInput: true,
        supportsDocumentInput: false,
        supportsTools: false,
        supportsThinking: true,
        supportsImageGeneration: false,
      };

      const caps = resolveModelCapabilities(model);
      expect(caps.input.image).toBe(true);
      expect(caps.input.document).toBe(false);
      expect(caps.tools).toBe(false);
      expect(caps.thinking).toBe(true);
    });

    it('migrates legacy supportsVision to image input', () => {
      const model: LLMModel = {
        id: 'legacy-model',
        name: 'Legacy',
        supportsVision: true,
      };

      const caps = resolveModelCapabilities(model);
      expect(caps.input.image).toBe(true);
    });

    it('falls back to heuristics when flags missing', () => {
      const model = {
        id: 'gpt-4o',
        name: 'GPT-4o',
      } as LLMModel;

      const caps = resolveModelCapabilities(model);
      expect(caps.input.image).toBe(true);
      expect(caps.input.document).toBe(true);
      expect(caps.tools).toBe(true);
    });
  });
});
