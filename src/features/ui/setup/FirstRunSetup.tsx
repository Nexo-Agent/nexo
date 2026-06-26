import { useState } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { setSetupCompleted } from '@/features/ui/state/uiSlice';
import { Button } from '@/ui/atoms/button/button';
import { FormDialog } from '@/ui/molecules/FormDialog';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/atoms/select';
import { ProviderIcon } from '@/ui/atoms/provider-icon';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useCreateLLMConnectionMutation } from '@/features/llm/state/api';
import type { LLMConnection, LLMModel } from '@/features/llm/types';
import { Loader2, Key, Globe, Bot } from 'lucide-react';
import { logger } from '@/lib/logger';

type Step = 'welcome' | 'llm-setup';

const DEFAULT_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  ollama: 'http://localhost:11434/v1',
  vllm: 'http://localhost:8000/v1',
  litellm: 'http://0.0.0.0:4000',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  together: 'https://api.together.xyz/v1',
  deepinfra: 'https://api.deepinfra.com/v1/openai',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  anthropic: 'https://api.anthropic.com',
  deepseek: 'https://api.deepseek.com',
};

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google Gemini' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'vllm', label: 'vLLM' },
  { value: 'litellm', label: 'LiteLLM' },
  { value: 'fireworks', label: 'Fireworks AI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'groq', label: 'Groq' },
  { value: 'together', label: 'Together AI' },
  { value: 'deepinfra', label: 'DeepInfra' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'deepseek', label: 'DeepSeek' },
];

export function FirstRunSetup({ open }: { open: boolean }) {
  const dispatch = useAppDispatch();
  const [createLLMConnection] = useCreateLLMConnectionMutation();
  const [step, setStep] = useState<Step>('welcome');

  const [llmConfig, setLlmConfig] = useState<{
    provider: LLMConnection['provider'];
    apiKey: string;
    baseUrl: string;
  }>({
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startSetup = () => {
    setStep('llm-setup');
  };

  const skipSetup = () => {
    dispatch(setSetupCompleted(true));
  };

  const handleLlmSubmit = async () => {
    setIsSubmitting(true);
    try {
      let models: LLMModel[] = [];
      try {
        const fetchedModels = await invokeCommand<LLMModel[]>(
          TauriCommands.TEST_LLM_CONNECTION,
          {
            baseUrl: llmConfig.baseUrl,
            provider: llmConfig.provider,
            apiKey: llmConfig.apiKey || null,
          }
        );
        models = filterPopularModels(fetchedModels, llmConfig.provider);
      } catch (error) {
        logger.error('Failed to fetch models during setup:', error);
      }

      await createLLMConnection({
        name: 'Default Connection',
        provider: llmConfig.provider,
        baseUrl: llmConfig.baseUrl,
        apiKey: llmConfig.apiKey,
        models,
        enabled: true,
      }).unwrap();

      dispatch(setSetupCompleted(true));
    } catch (error) {
      logger.error('Failed to create LLM connection', error);
      const { toast } = await import('sonner');
      toast.error(
        'Failed to create LLM connection. You can configure it later in Settings.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterPopularModels = (
    models: LLMModel[],
    provider: string
  ): LLMModel[] => {
    if (provider === 'openai') {
      const popularModelPatterns = [
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-5',
        'o1',
        'gpt-5.1',
      ];
      return models.filter((model) => {
        const modelId = model.id.toLowerCase();
        const modelName = model.name.toLowerCase();
        return popularModelPatterns.some(
          (pattern) => modelId === pattern || modelName === pattern
        );
      });
    }
    if (provider === 'google') {
      const popularModelPatterns = [
        'gemini-2.0-flash',
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-3-flash-preview',
        'gemini-3-pro-preview',
        'gemini-2.5-flash-image',
        'gemini-3-pro-image-preview',
      ];
      return models.filter((model) => {
        const modelId = model.id.toLowerCase();
        const modelName = model.name.toLowerCase();
        return popularModelPatterns.some(
          (pattern) => modelId === pattern || modelName === pattern
        );
      });
    }
    return models;
  };

  const titles: Record<Step, string> = {
    welcome: 'Chào mừng đến với Cogito Studio',
    'llm-setup': 'Kết nối AI của bạn',
  };

  const descriptions: Record<Step, string> = {
    welcome:
      'Không gian làm việc AI mạnh mẽ, ưu tiên xử lý cục bộ. Hãy để chúng tôi chuẩn bị mọi thứ cho bạn.',
    'llm-setup':
      'Chọn nhà cung cấp AI yêu thích để bắt đầu trò chuyện và tạo mã nguồn.',
  };

  const renderFooter = () => {
    if (step === 'welcome') {
      return (
        <div className="flex w-full items-center justify-between">
          <Button
            variant="ghost"
            onClick={skipSetup}
            className="text-muted-foreground hover:text-foreground hover:bg-transparent px-2 font-semibold text-[14px]"
          >
            Bỏ qua thiết lập
          </Button>
          <Button
            onClick={startSetup}
            className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 px-8 h-11 text-[14px] font-semibold rounded min-w-[160px]"
          >
            Bắt đầu thiết lập
          </Button>
        </div>
      );
    }

    if (step === 'llm-setup') {
      return (
        <div className="flex w-full items-center justify-between">
          <Button
            variant="ghost"
            onClick={skipSetup}
            className="text-muted-foreground hover:text-foreground hover:bg-transparent px-2 font-semibold text-[14px]"
          >
            Bỏ qua
          </Button>
          <Button
            onClick={handleLlmSubmit}
            disabled={isSubmitting || !llmConfig.apiKey}
            className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all px-8 h-11 text-[14px] font-bold rounded min-w-[160px]"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Kết nối
          </Button>
        </div>
      );
    }

    return null;
  };

  if (!open) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={(val) => !val && skipSetup()}
      title={titles[step]}
      description={descriptions[step]}
      footer={renderFooter()}
      className="sm:max-w-[540px]"
    >
      <div className="flex-1 py-4 flex flex-col">
        {step === 'welcome' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase px-1">
                Cài đặt đề xuất bao gồm
              </h4>
              <div className="grid gap-2.5">
                <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-muted/40 border border-border/30 hover:bg-muted/60 transition-all duration-300">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 ring-1 ring-purple-500/20 shadow-sm">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">
                      Kết nối LLM mặc định
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Thiết lập mô hình ngôn ngữ để bắt đầu làm việc
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'llm-setup' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="grid gap-2">
              <Label className="text-[12px] font-semibold text-foreground/80 ml-1">
                Nhà cung cấp AI
              </Label>
              <Select
                value={llmConfig.provider}
                onValueChange={(val) =>
                  setLlmConfig((prev) => ({
                    ...prev,
                    provider: val as LLMConnection['provider'],
                    baseUrl:
                      (!prev.baseUrl ||
                        prev.baseUrl === DEFAULT_URLS[prev.provider]) &&
                      DEFAULT_URLS[val]
                        ? DEFAULT_URLS[val]
                        : prev.baseUrl,
                  }))
                }
              >
                <SelectTrigger className="w-full h-11 rounded-xl border-border/60 bg-muted/30 focus:ring-primary/20 transition-all hover:bg-muted/50 focus:bg-background">
                  <SelectValue placeholder="Chọn nhà cung cấp" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl border-border/40">
                  {PROVIDER_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="py-2"
                    >
                      <div className="flex items-center gap-3">
                        <ProviderIcon
                          provider={option.value}
                          className="h-4 w-4"
                        />
                        <span className="font-medium text-sm">
                          {option.label}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-[12px] font-semibold text-foreground/80 ml-1">
                  Base URL
                </Label>
                <div className="relative group">
                  <Globe className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                  <Input
                    className="h-10 pl-10 rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-all text-sm"
                    value={llmConfig.baseUrl}
                    onChange={(e) =>
                      setLlmConfig((prev) => ({
                        ...prev,
                        baseUrl: e.target.value,
                      }))
                    }
                    placeholder="https://api..."
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[12px] font-semibold text-foreground/80">
                    API Key
                  </Label>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-wider">
                    Lưu trữ cục bộ
                  </span>
                </div>
                <div className="relative group">
                  <Key className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                  <Input
                    className="h-10 pl-10 rounded-xl border-border/60 font-mono text-sm bg-muted/30 focus:bg-background transition-all"
                    type="password"
                    value={llmConfig.apiKey}
                    onChange={(e) =>
                      setLlmConfig((prev) => ({
                        ...prev,
                        apiKey: e.target.value,
                      }))
                    }
                    placeholder="sk-..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
