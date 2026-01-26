import { useTranslation } from 'react-i18next';
import { Trash2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
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

        {/* Connection Status */}
        {(isTesting || testStatus) && (
          <div className="space-y-2 w-full pt-1">
            {isTesting ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <RefreshCw className="size-4 animate-spin" />
                <span>{t('testing')}</span>
              </div>
            ) : testStatus === 'success' ? (
              <div className="flex items-center gap-2 text-sm text-success font-medium">
                <CheckCircle2 className="size-4" />
                <span>{t('connectionSuccess', { count: models.length })}</span>
              </div>
            ) : testStatus === 'error' ? (
              <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                <XCircle className="size-4" />
                <span>{testError || t('connectionFailed')}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Models List */}
        {models.length > 0 && (
          <div className="space-y-2 w-full">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('modelsList', { count: models.length })}
            </Label>
            <div className="max-h-[200px] w-full rounded-md border bg-muted/20 overflow-y-auto p-2 space-y-1">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between rounded-md bg-background/50 px-2 py-1.5 text-sm border border-border/40"
                >
                  <span className="font-medium">{model.name}</span>
                  {model.owned_by && (
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {model.owned_by}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
