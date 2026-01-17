import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Network,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProviderIcon } from '@/ui/atoms/provider-icon';
import { Button } from '@/ui/atoms/button/button';
import { EmptyState } from '@/ui/atoms/empty-state';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/atoms/select';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { Switch } from '@/ui/atoms/switch';
import { useAppDispatch } from '@/app/hooks';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import {
  useGetLLMConnectionsQuery,
  useCreateLLMConnectionMutation,
  useUpdateLLMConnectionMutation,
  useDeleteLLMConnectionMutation,
  useToggleLLMConnectionEnabledMutation,
} from '../hooks/useLLMConnections';
import type { LLMConnection, LLMModel } from '../types';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import { logger } from '@/lib/logger';

export function LLMConnections() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();

  // Use RTK Query hooks
  const { data: llmConnections = [] } = useGetLLMConnectionsQuery();
  const [createConnection] = useCreateLLMConnectionMutation();
  const [updateConnection] = useUpdateLLMConnectionMutation();
  const [deleteConnection] = useDeleteLLMConnectionMutation();
  const [toggleEnabled] = useToggleLLMConnectionEnabledMutation();

  const [editingConnection, setEditingConnection] =
    useState<LLMConnection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(
    null
  );

  const handleAdd = () => {
    setEditingConnection(null);
    setDialogOpen(true);
  };

  const handleEdit = (connection: LLMConnection) => {
    setEditingConnection(connection);
    setDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!connectionToDelete) return;

    try {
      await deleteConnection(connectionToDelete).unwrap();
      setDeleteDialogOpen(false);
      setConnectionToDelete(null);
      dispatch(
        showSuccess(t('connectionDeleted'), t('connectionDeletedDescription'))
      );
    } catch (error) {
      logger.error('Error deleting LLM connection:', error);
      dispatch(showError(t('cannotDeleteConnection')));
    }
  };

  const handleToggleEnabled = async (
    connectionId: string,
    currentEnabled: boolean
  ) => {
    try {
      await toggleEnabled({
        id: connectionId,
        enabled: !currentEnabled,
      }).unwrap();
      // No toast notification for toggle action
    } catch (error) {
      logger.error('Error toggling LLM connection:', error);
      dispatch(showError(t('cannotToggleConnection')));
    }
  };

  const handleSave = async (connection: Omit<LLMConnection, 'id'>) => {
    try {
      if (editingConnection) {
        // Update existing connection
        await updateConnection({
          id: editingConnection.id,
          connection: {
            name: connection.name,
            baseUrl: connection.baseUrl,
            provider: connection.provider,
            apiKey: connection.apiKey,
            models: connection.models,
          },
        }).unwrap();

        dispatch(showSuccess(t('connectionSaved'), t('connectionUpdated')));
      } else {
        // Create new connection
        await createConnection(connection).unwrap();
        dispatch(showSuccess(t('connectionSaved'), t('newConnectionCreated')));
      }

      setDialogOpen(false);
      setEditingConnection(null);
    } catch (error) {
      logger.error('Error saving LLM connection:', error);
      dispatch(showError(t('cannotSaveConnection')));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('manageLLMConnections')}
        </p>
        <Button onClick={handleAdd} size="sm" data-tour="llm-add-btn">
          <Plus className="mr-2 size-4" />
          {t('addConnection')}
        </Button>
      </div>

      {llmConnections.length === 0 ? (
        <EmptyState icon={Network} title={t('noConnections')} />
      ) : (
        <ScrollArea className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {llmConnections.map((connection) => {
              // Filter models for display
              const displayModels = connection.models
                ? filterPopularModels(connection.models, connection.provider)
                : [];

              return (
                <div
                  key={connection.id}
                  className={`group relative rounded-lg border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200 overflow-hidden ${
                    !connection.enabled ? 'opacity-60' : ''
                  }`}
                >
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  <div className="relative space-y-3">
                    {/* Header with icon, name, and toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div
                        onClick={() => handleEdit(connection)}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                          <ProviderIcon
                            provider={connection.provider}
                            className="size-5"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-normal truncate py-0">
                              {connection.name}
                            </span>
                            {!connection.enabled && (
                              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                Disabled
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground capitalize">
                            {connection.provider}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={connection.enabled}
                        onCheckedChange={() =>
                          handleToggleEnabled(connection.id, connection.enabled)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Models list */}
                    {displayModels.length > 0 && (
                      <div
                        onClick={() => handleEdit(connection)}
                        className="space-y-1.5 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="font-medium">
                            {displayModels.length}{' '}
                            {displayModels.length === 1 ? 'model' : 'models'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {displayModels.slice(0, 3).map((model) => (
                            <span
                              key={model.id}
                              className="inline-flex items-center rounded-md bg-muted/60 px-2 py-1 text-xs text-foreground/80 group-hover:bg-muted transition-colors"
                            >
                              {model.name}
                            </span>
                          ))}
                          {displayModels.length > 3 && (
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs text-primary font-medium">
                              +{displayModels.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <LLMConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connection={editingConnection}
        onSave={handleSave}
        onDelete={
          editingConnection
            ? () => {
                setConnectionToDelete(editingConnection.id);
                setDialogOpen(false);
                setDeleteDialogOpen(true);
              }
            : undefined
        }
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        connectionName={
          llmConnections.find((c) => c.id === connectionToDelete)?.name
        }
      />
    </div>
  );
}

interface LLMConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: LLMConnection | null;
  onSave: (connection: Omit<LLMConnection, 'id'>) => void;
  onDelete?: () => void;
}

function LLMConnectionDialog({
  open,
  onOpenChange,
  connection,
  onSave,
  onDelete,
}: LLMConnectionDialogProps) {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {connection ? t('editConnection') : t('addNewConnection')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('configureConnection')}
          </p>
        </DialogHeader>

        <LLMConnectionForm
          connection={connection}
          onSave={onSave}
          onDelete={
            onDelete
              ? () => {
                  onDelete();
                  // Ensure dialog doesn't close prematurely if onDelete handles it (it sets deleteDialogOpen)
                  // But here we rely on parent to handle state probably
                }
              : undefined
          }
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface LLMConnectionFormProps {
  connection: LLMConnection | null;
  onSave: (connection: Omit<LLMConnection, 'id'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

// Helper function to filter popular OpenAI models
const filterPopularModels = (
  models: LLMModel[],
  provider: string
): LLMModel[] => {
  if (provider === 'openai') {
    // List of popular OpenAI models to display
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
    // List of popular Google Gemini models to display
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

  // For other providers, return all models
  return models;
};

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

const PROVIDER_OPTIONS: { value: LLMConnection['provider']; label: string }[] =
  [
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

export function LLMConnectionForm({
  connection,
  onSave,
  onDelete,
  onClose,
}: LLMConnectionFormProps) {
  const { t } = useTranslation(['settings', 'common']);

  // Initialize state directly from props.
  // Since this component mounts only when Dialog opens, state is always fresh.
  const [name, setName] = useState(connection?.name || '');
  const [provider, setProvider] = useState<LLMConnection['provider']>(
    connection?.provider || 'openai'
  );
  const [baseUrl, setBaseUrl] = useState(
    connection?.baseUrl || DEFAULT_URLS[connection?.provider || 'openai'] || ''
  );
  const [apiKey, setApiKey] = useState(connection?.apiKey || '');
  // Filter models even when loading from existing connection
  const [models, setModels] = useState<LLMModel[]>(
    connection?.models
      ? filterPopularModels(connection.models, connection.provider)
      : []
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'success' | 'error' | null>(
    null
  );
  const [testError, setTestError] = useState<string>('');

  const handleTestConnection = useCallback(async () => {
    if (!baseUrl.trim()) {
      setTestError(t('enterBaseUrl'));
      setTestStatus('error');
      return null;
    }

    setIsTesting(true);
    setTestStatus(null);
    setTestError('');

    const startTime = performance.now();

    try {
      const fetchedModels = await invokeCommand<LLMModel[]>(
        TauriCommands.TEST_LLM_CONNECTION,
        {
          baseUrl: baseUrl.trim(),
          provider,
          apiKey: apiKey.trim() || null,
        }
      );

      // Filter popular models for OpenAI provider
      const filteredModels = filterPopularModels(fetchedModels, provider);
      setModels(filteredModels);
      setTestStatus('success');

      // Track successful connection test
      const duration = performance.now() - startTime;
      const { trackConnectionOperation } = await import('@/lib/sentry-utils');
      trackConnectionOperation('llm', 'test', connection?.id || 'new', true);

      // Track API call performance
      const { trackAPICall } = await import('@/lib/sentry-utils');
      trackAPICall(baseUrl.trim(), 'GET', duration, true);

      return filteredModels;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : t('cannotConnectToAPI');
      setTestError(errorMessage);
      setTestStatus('error');
      setModels([]);

      // Track failed connection test
      const duration = performance.now() - startTime;
      const { trackConnectionOperation, trackAPICall } =
        await import('@/lib/sentry-utils');
      trackConnectionOperation(
        'llm',
        'test',
        connection?.id || 'new',
        false,
        errorMessage
      );
      trackAPICall(baseUrl.trim(), 'GET', duration, false);
      return null;
    } finally {
      setIsTesting(false);
    }
  }, [baseUrl, apiKey, provider, connection?.id, t]);

  useEffect(() => {
    // Only auto-test if baseUrl is present
    if (!baseUrl.trim()) {
      setTestStatus(null);
      setTestError('');
      setModels([]);
      return;
    }

    const timer = setTimeout(() => {
      handleTestConnection();
    }, 800); // 800ms debounce to avoid excessive API calls while typing

    return () => clearTimeout(timer);
  }, [handleTestConnection, baseUrl, apiKey, provider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && baseUrl.trim()) {
      // Trigger test connection on save to ensure models are up-to-date
      const currentModels = await handleTestConnection();

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
        enabled: connection?.enabled ?? true, // Keep existing enabled state or default to true for new connections
      });
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      <DialogBody className="overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4 pr-4">
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
              <Select
                value={provider}
                onValueChange={(value: LLMConnection['provider']) => {
                  setProvider(value);
                  if (!baseUrl || baseUrl === DEFAULT_URLS[provider]) {
                    setBaseUrl(DEFAULT_URLS[value]);
                  }
                }}
              >
                <SelectTrigger
                  className="w-full"
                  data-tour="llm-provider-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <ProviderIcon
                          provider={option.value}
                          className="size-4"
                        />
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
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="size-4" />
                    <span>
                      {t('connectionSuccess', { count: models.length })}
                    </span>
                  </div>
                ) : testStatus === 'error' ? (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <XCircle className="size-4" />
                    <span>{testError || t('connectionFailed')}</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Models List */}
            {models.length > 0 && (
              <div className="space-y-2 w-full">
                <Label>{t('modelsList', { count: models.length })}</Label>
                <ScrollArea className="h-[200px] w-full rounded-md border p-3">
                  <div className="space-y-1">
                    {models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-sm"
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
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogBody>
      <DialogFooter className="shrink-0 justify-between gap-2">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            className="flex-1"
          >
            <Trash2 className="mr-2 size-4" />
            {t('delete', { ns: 'common' })}
          </Button>
        )}
        <Button
          type="submit"
          disabled={!name.trim() || !baseUrl.trim() || isTesting}
          className="flex-1"
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
      </DialogFooter>
    </form>
  );
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  connectionName?: string;
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  connectionName,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation(['settings', 'common']);

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('deleteConnection')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('confirmDeleteConnection')}
            {connectionName && (
              <span className="font-semibold">{connectionName}</span>
            )}
            ?
          </p>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            {t('delete', { ns: 'common' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
