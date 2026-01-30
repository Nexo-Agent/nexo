import { useTranslation } from 'react-i18next';
import { Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/ui/atoms/button/button';
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
import type { LLMConnection } from '../types';
import { DEFAULT_URLS, PROVIDER_OPTIONS } from '../lib/constants';
import { useTestConnection } from '../hooks/useTestConnection';
import { useLLMConnectionForm } from '../hooks/useLLMConnectionForm';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { cn } from '@/lib/utils';

interface LLMConnectionFormProps {
  connection: LLMConnection | null;
  onSave: (connection: Omit<LLMConnection, 'id'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Form component for creating/editing LLM connections
 * Uses useLLMConnectionForm for state management
 * Uses useTestConnection for automatic connection testing
 */
export function LLMConnectionForm({
  connection,
  onSave,
  onDelete,
  onClose,
}: LLMConnectionFormProps) {
  const { t } = useTranslation(['settings', 'common']);

  // Use custom hook for form state management
  const {
    name,
    setName,
    provider,
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    handleProviderChange,
    isValid,
  } = useLLMConnectionForm({ connection });

  // Use custom hook for testing connection
  const { isTesting, testStatus, testError, models, testConnection } =
    useTestConnection({
      baseUrl,
      apiKey,
      provider,
      connectionId: connection?.id,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      // Trigger test connection on save to ensure models are up-to-date
      const currentModels = await testConnection();

      // If test failed, we still save but use existing models if available
      const modelsToSave =
        currentModels && currentModels.length > 0
          ? currentModels
          : models.length > 0
            ? models
            : undefined;

      onSave({
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        provider,
        apiKey,
        models: modelsToSave,
        enabled: connection?.enabled ?? true,
      });
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2 w-full">
          <Label htmlFor="name">{t('connectionName')}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('connectionNamePlaceholder')}
            className="w-full"
            required
            data-tour="llm-name-input"
          />
        </div>
        <div className="space-y-2 w-full">
          <Label htmlFor="provider">{t('provider')}</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger className="w-full" data-tour="llm-provider-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <ProviderIcon provider={option.value} className="size-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 w-full">
          <Label htmlFor="baseUrl">{t('baseUrl')}</Label>
          <Input
            id="baseUrl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={DEFAULT_URLS[provider]}
            className="w-full"
            required
          />
        </div>
        <div className="space-y-2 w-full">
          <Label htmlFor="apiKey">{t('apiKey')}</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              provider === 'vllm' || provider === 'ollama'
                ? t('optional') + ' ' + t('enterApiKey')
                : t('enterApiKey')
            }
            className="w-full"
            data-tour="llm-api-key-input"
          />
        </div>

        <div
          className={cn(
            'flex items-center gap-2 text-sm font-medium',
            testStatus === 'success'
              ? 'text-success'
              : testStatus === 'error'
                ? 'text-destructive'
                : 'text-muted-foreground'
          )}
        >
          <CheckCircle2 className="size-4" />
          <span>
            {testStatus === 'success'
              ? t('connectionSuccess', { count: models.length })
              : testStatus === 'error'
                ? testError
                : t('testing')}
          </span>
        </div>

        {/* Models List */}
        <div className="space-y-2 w-full">
          <Label>{t('modelsList', { count: models.length })}</Label>
          {models.length > 0 ? (
            <ScrollArea className="h-[200px] w-full rounded-md border p-3">
              <div className="flex gap-y-4 flex-col">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between rounded-md bg-muted px-2 text-sm"
                  >
                    <span>{model.name}</span>
                    {model.owned_by && (
                      <span className="text-xs text-muted-foreground">
                        {model.owned_by}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[200px] w-full rounded-md border p-3">
              <div className="flex items-center justify-center h-full">
                <span className="text-muted-foreground">{t('noModels')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 sticky bottom-0 bg-background/0">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            className="flex-1 h-10"
          >
            <Trash2 className="mr-2 size-4" />
            {t('delete', { ns: 'common' })}
          </Button>
        )}
        <Button
          type="submit"
          disabled={!name.trim() || !baseUrl.trim() || isTesting}
          className="flex-1 h-10"
          data-tour="llm-save-btn"
        >
          {isTesting ? (
            <>
              <RefreshCw className="mr-2 size-4 animate-spin" />
              {t('saving', { ns: 'common' })}
            </>
          ) : connection ? (
            t('save', { ns: 'common' })
          ) : (
            t('add', { ns: 'common' })
          )}
        </Button>
      </div>
    </form>
  );
}
