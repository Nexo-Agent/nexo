import { useState } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { setSetupCompleted } from '@/features/ui/state/uiSlice';
import { Button } from '@/ui/atoms/button/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog';
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
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Cpu,
  Terminal,
  Key,
  Globe,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/atoms/card';
import { logger } from '@/lib/logger';

type Step = 'welcome' | 'installing' | 'llm-setup' | 'completed';

interface RuntimeStatus {
  version: string;
  installed: boolean;
  path: string | null;
}

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
  const [installStatus, setInstallStatus] = useState<{
    python: 'pending' | 'installing' | 'success' | 'error';
    node: 'pending' | 'installing' | 'success' | 'error';
  }>({ python: 'pending', node: 'pending' });

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

  const installPython = async () => {
    try {
      setInstallStatus((prev) => ({ ...prev, python: 'installing' }));
      const pyStatuses = await invokeCommand<RuntimeStatus[]>(
        TauriCommands.GET_PYTHON_RUNTIMES_STATUS
      );

      if (pyStatuses.length > 0) {
        // Sort to get latest version
        const sorted = [...pyStatuses].sort((a, b) =>
          b.version.localeCompare(a.version, undefined, { numeric: true })
        );
        const targetVersion = sorted[0].version;

        if (!sorted[0].installed) {
          await invokeCommand(TauriCommands.INSTALL_PYTHON_RUNTIME, {
            version: targetVersion,
          });

          // Verify installation
          const updatedStatuses = await invokeCommand<RuntimeStatus[]>(
            TauriCommands.GET_PYTHON_RUNTIMES_STATUS
          );
          const updatedStatus = updatedStatuses.find(
            (s) => s.version === targetVersion
          );

          if (!updatedStatus?.installed) {
            throw new Error(`Verification failed for Python ${targetVersion}`);
          }
        }
        setInstallStatus((prev) => ({ ...prev, python: 'success' }));
      } else {
        logger.error('No Python runtimes available to install');
        setInstallStatus((prev) => ({ ...prev, python: 'error' }));
      }
    } catch (error) {
      logger.error('Python install failed', error);
      setInstallStatus((prev) => ({ ...prev, python: 'error' }));
    }
  };

  const installNode = async () => {
    try {
      setInstallStatus((prev) => ({ ...prev, node: 'installing' }));
      const nodeStatuses = await invokeCommand<RuntimeStatus[]>(
        TauriCommands.GET_NODE_RUNTIMES_STATUS
      );

      if (nodeStatuses.length > 0) {
        // Sort to get latest version
        const sorted = [...nodeStatuses].sort((a, b) =>
          b.version.localeCompare(a.version, undefined, { numeric: true })
        );
        const targetVersion = sorted[0].version;

        if (!sorted[0].installed) {
          await invokeCommand(TauriCommands.INSTALL_NODE_RUNTIME, {
            version: targetVersion,
          });

          // Verify installation
          const updatedStatuses = await invokeCommand<RuntimeStatus[]>(
            TauriCommands.GET_NODE_RUNTIMES_STATUS
          );
          const updatedStatus = updatedStatuses.find(
            (s) => s.version === targetVersion
          );

          if (!updatedStatus?.installed) {
            throw new Error(`Verification failed for Node.js ${targetVersion}`);
          }
        }
        setInstallStatus((prev) => ({ ...prev, node: 'success' }));
      } else {
        logger.error('No Node.js runtimes available to install');
        setInstallStatus((prev) => ({ ...prev, node: 'error' }));
      }
    } catch (error) {
      logger.error('Node install failed', error);
      setInstallStatus((prev) => ({ ...prev, node: 'error' }));
    }
  };

  const installRuntimes = async () => {
    await Promise.all([installPython(), installNode()]);

    // Setup completed
    setTimeout(() => {
      dispatch(setSetupCompleted(true));
    }, 1000);
  };

  const handleLlmSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Fetch models first
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
        // Filter popular models like in Settings
        models = filterPopularModels(fetchedModels, llmConfig.provider);
      } catch (error) {
        logger.error('Failed to fetch models during setup:', error);
        // We continue even if model fetching fails, saving an empty list
        // which the user can fix later in settings
      }

      // 2. Create connection with models
      await createLLMConnection({
        name: 'Default Connection',
        provider: llmConfig.provider,
        baseUrl: llmConfig.baseUrl,
        apiKey: llmConfig.apiKey,
        models,
        enabled: true,
      }).unwrap();
    } catch (error) {
      logger.error('Failed to create LLM connection', error);
      const { toast } = await import('sonner');
      toast.error(
        'Failed to create LLM connection. You can configure it later in Settings.'
      );
    } finally {
      setIsSubmitting(false);
      setStep('installing');
      installRuntimes();
    }
  };

  // Helper function to filter popular models (duplicated from LLMConnections.tsx)
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

  if (!open) return null;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-[600px] h-[650px] flex flex-col border-border/50 shadow-2xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="items-center justify-center shrink-0 h-[220px] pb-6 pt-10 text-center bg-muted/30 border-b border-border/40">
          {step === 'welcome' && (
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-background shadow-xl ring-1 ring-border/50 animate-in zoom-in-50 duration-700">
              <img
                src="/icon.svg"
                alt="Nexo Logo"
                className="h-14 w-14 drop-shadow-sm"
              />
            </div>
          )}
          <DialogTitle className="text-3xl font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent px-6">
            {step === 'welcome' && 'Welcome to Nexo'}
            {step === 'installing' && 'Setting up Environment'}
            {step === 'llm-setup' && 'Connect Your AI'}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground/80 max-w-[420px] mt-3 px-6 leading-relaxed">
            {step === 'welcome' &&
              'Your powerful, local-first AI workspace. Let’s get everything ready for you.'}
            {step === 'installing' &&
              'We are installing the necessary runtimes to power your automated workflows.'}
            {step === 'llm-setup' &&
              'Choose your preferred AI provider to start chatting and generating code.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex-1 py-8 px-8 flex flex-col justify-center overflow-y-auto">
          {step === 'welcome' && (
            <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              <Card className="border-border/50 bg-card/50 shadow-sm">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Recommended Setup Includes
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-foreground/80 px-5 pb-5">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20">
                      <Terminal className="h-4 w-4" />
                    </div>
                    <span>Python & Node.js Runtimes</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple-500/10 text-purple-500 ring-1 ring-purple-500/20">
                      <Bot className="h-4 w-4" />
                    </div>
                    <span>Default LLM Connection</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 'installing' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-700">
              <RuntimeInstallCard
                icon={<Cpu className="h-5 w-5" />}
                title="Python Runtime"
                description="Core environment for AI agents"
                status={installStatus.python}
              />
              <RuntimeInstallCard
                icon={<Terminal className="h-5 w-5" />}
                title="Node.js Runtime"
                description="Engine for JavaScript tools"
                status={installStatus.node}
              />
            </div>
          )}

          {step === 'llm-setup' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="grid gap-2">
                <Label className="text-sm font-medium text-foreground">
                  AI Provider
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
                  <SelectTrigger className="w-full h-11 border-input bg-background/50 focus:ring-primary/20 transition-[background-color,box-shadow,ring] hover:bg-accent/50 focus:bg-background">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <ProviderIcon
                            provider={option.value}
                            className="h-4 w-4"
                          />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium text-foreground">
                    Base URL
                  </Label>
                  <div className="relative group">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      className="h-10 pl-9 bg-background/50 focus:bg-background transition-colors"
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
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">
                      API Key
                    </Label>
                    <span className="text-[10px] uppercase font-medium text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-full">
                      Stored Locally
                    </span>
                  </div>
                  <div className="relative group">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      className="h-10 pl-9 font-mono text-sm bg-background/50 focus:bg-background transition-colors"
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
        </DialogBody>

        <DialogFooter className="sm:justify-between px-8 py-6 bg-muted/10 border-t border-border/40">
          {step === 'welcome' && (
            <>
              <Button
                variant="ghost"
                size="lg"
                onClick={skipSetup}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent px-0 font-medium"
              >
                Skip Setup
              </Button>
              <Button
                size="lg"
                onClick={startSetup}
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-[background-color,box-shadow,transform] px-8 h-12 text-base font-medium rounded-xl"
              >
                Start Auto Setup
              </Button>
            </>
          )}

          {step === 'installing' && (
            <div className="w-full text-center">
              <span className="text-sm font-medium text-muted-foreground animate-pulse">
                Configuring your workspace...
              </span>
            </div>
          )}

          {step === 'llm-setup' && (
            <>
              <Button
                variant="ghost"
                onClick={skipSetup}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent px-0 font-medium"
              >
                Skip
              </Button>
              <Button
                size="lg"
                onClick={handleLlmSubmit}
                disabled={isSubmitting || !llmConfig.apiKey}
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-[background-color,box-shadow,transform] min-w-[140px] rounded-xl h-11"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Connect & Install Environment
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuntimeInstallCard({
  icon,
  title,
  description,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'pending' | 'installing' | 'success' | 'error';
}) {
  return (
    <div
      className={cn(
        'group flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card/60 transition-[background-color,border-color,box-shadow,ring] duration-300 backdrop-blur-sm',
        status === 'installing' &&
          'border-primary/50 bg-primary/5 ring-1 ring-primary/20 shadow-[0_0_20px_-10px_rgba(var(--primary),0.2)]',
        status === 'success' && 'border-green-500/30 bg-green-500/5',
        status === 'error' && 'border-destructive/30 bg-destructive/5'
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background border border-border/50 shadow-sm transition-[background-color,border-color,transform,box-shadow] duration-300',
            status === 'installing' &&
              'text-primary border-primary/20 scale-105',
            status === 'success' &&
              'text-green-600 border-green-500/20 bg-green-50',
            status === 'error' &&
              'text-destructive border-destructive/20 bg-destructive/10'
          )}
        >
          {status === 'installing' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : status === 'success' ? (
            <CheckCircle2 className="h-6 w-6 animate-in zoom-in duration-300" />
          ) : status === 'error' ? (
            <XCircle className="h-6 w-6 animate-in zoom-in duration-300" />
          ) : (
            <div className="opacity-70 group-hover:opacity-100 transition-opacity">
              {icon}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold tracking-tight text-foreground">
            {title}
          </span>
          <span className="text-sm text-muted-foreground">{description}</span>
        </div>
      </div>
      <div className="pl-4">
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending')
    return (
      <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
        Waiting
      </span>
    );
  if (status === 'installing')
    return (
      <span className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">
        Installing...
      </span>
    );
  if (status === 'success')
    return (
      <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">
        Ready
      </span>
    );
  if (status === 'error')
    return (
      <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">
        Failed
      </span>
    );
  return null;
}
