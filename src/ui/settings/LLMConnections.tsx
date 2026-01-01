import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Network,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import {
  addLLMConnection,
  updateLLMConnection,
  removeLLMConnection,
} from '@/store/slices/llmConnectionsSlice';
import { refreshLLMConnections } from '@/store/slices/llmConnectionsSlice';
import { showError, showSuccess } from '@/store/slices/notificationSlice';

export interface LLMModel {
  id: string;
  name: string;
  created?: number;
  owned_by?: string;
}

export interface LLMConnection {
  id: string;
  name: string;
  baseUrl: string;
  provider: 'openai' | 'ollama';
  apiKey: string;
  models?: LLMModel[];
}

export function LLMConnections() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const llmConnections = useAppSelector(
    (state) => state.llmConnections.llmConnections
  );
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
      await dispatch(removeLLMConnection(connectionToDelete)).unwrap();
      // Refresh connections from database
      await dispatch(refreshLLMConnections()).unwrap();
      setDeleteDialogOpen(false);
      setConnectionToDelete(null);
      dispatch(
        showSuccess(t('connectionDeleted'), t('connectionDeletedDescription'))
      );
    } catch (error) {
      console.error('Error deleting LLM connection:', error);
      dispatch(showError(t('cannotDeleteConnection')));
    }
  };

  const handleSave = async (connection: Omit<LLMConnection, 'id'>) => {
    try {
      if (editingConnection) {
        // Update existing connection
        await dispatch(
          updateLLMConnection({
            id: editingConnection.id,
            connection: {
              name: connection.name,
              baseUrl: connection.baseUrl,
              provider: connection.provider,
              apiKey: connection.apiKey,
              models: connection.models,
            },
          })
        ).unwrap();
      } else {
        // Create new connection
        await dispatch(addLLMConnection(connection)).unwrap();
      }
      // Refresh connections from database
      await dispatch(refreshLLMConnections()).unwrap();
      setDialogOpen(false);
      setEditingConnection(null);

      // Show success notification
      dispatch(
        showSuccess(
          t('connectionSaved'),
          editingConnection ? t('connectionUpdated') : t('newConnectionCreated')
        )
      );
    } catch (error) {
      console.error('Error saving LLM connection:', error);
      dispatch(showError(t('cannotSaveConnection')));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">{t('llmConnections')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('manageLLMConnections')}
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="mr-2 size-4" />
          {t('addConnection')}
        </Button>
      </div>

      {llmConnections.length === 0 ? (
        <EmptyState
          icon={Network}
          title={t('noConnections')}
          action={
            <Button onClick={handleAdd} size="sm">
              <Plus className="mr-2 size-4" />
              {t('addConnection')}
            </Button>
          }
        />
      ) : (
        <ScrollArea className="h-full [&_[data-slot='scroll-area-scrollbar']]:hidden">
          <div className="space-y-2">
            {llmConnections.map((connection) => (
              <div
                key={connection.id}
                onClick={() => handleEdit(connection)}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{connection.name}</h4>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {connection.provider}
                    </span>
                    {connection.models && connection.models.length > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {connection.models.length}{' '}
                        {t('modelsList', { count: connection.models.length })
                          .split('(')[0]
                          .trim()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {connection.baseUrl}
                  </p>
                  {connection.models && connection.models.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {connection.models.slice(0, 5).map((model) => (
                        <span
                          key={model.id}
                          className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {model.name}
                        </span>
                      ))}
                      {connection.models.length > 5 && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {t('moreTools', {
                            count: connection.models.length - 5,
                          })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
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
  const [name, setName] = useState(connection?.name || '');
  const [baseUrl, setBaseUrl] = useState(connection?.baseUrl || '');
  const [provider, setProvider] = useState<'openai' | 'ollama'>(
    connection?.provider || 'openai'
  );
  const [apiKey, setApiKey] = useState(connection?.apiKey || '');
  const [models, setModels] = useState<LLMModel[]>(connection?.models || []);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'success' | 'error' | null>(
    null
  );
  const [testError, setTestError] = useState<string>('');
  const [hasTested, setHasTested] = useState(false);

  React.useEffect(() => {
    if (connection) {
      setName(connection.name);
      setBaseUrl(connection.baseUrl);
      setProvider(connection.provider);
      setApiKey(connection.apiKey);
      setModels(connection.models || []);
    } else {
      setName('');
      setBaseUrl('');
      setProvider('openai');
      setApiKey('');
      setModels([]);
    }
    setTestStatus(null);
    setTestError('');
    setHasTested(false);
  }, [connection, open]);

  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      setTestError(t('enterBaseUrl'));
      setTestStatus('error');
      return;
    }

    setIsTesting(true);
    setTestStatus(null);
    setTestError('');

    try {
      const fetchedModels = await invokeCommand<LLMModel[]>(
        TauriCommands.TEST_LLM_CONNECTION,
        {
          baseUrl: baseUrl.trim(),
          provider,
          apiKey: apiKey.trim() || null,
        }
      );
      setModels(fetchedModels);
      setTestStatus('success');
      setHasTested(true);
    } catch (error: unknown) {
      setTestError(
        error instanceof Error ? error.message : t('cannotConnectToAPI')
      );
      setTestStatus('error');
      setModels([]);
      setHasTested(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && baseUrl.trim()) {
      // If we've tested, use the tested models (even if empty)
      // Otherwise, keep the existing models from connection
      const modelsToSave = hasTested
        ? models && models.length > 0
          ? models
          : undefined
        : connection?.models && connection.models.length > 0
          ? connection.models
          : undefined;

      onSave({
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        provider,
        apiKey,
        models: modelsToSave,
      });
      onOpenChange(false);
    }
  };

  const defaultUrls = {
    openai: 'https://api.openai.com/v1',
    ollama: 'http://localhost:11434/v1',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {connection ? t('editConnection') : t('addNewConnection')}
            </DialogTitle>
            <DialogDescription>{t('configureConnection')}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ScrollArea className="h-full [&_[data-slot='scroll-area-scrollbar']]:hidden">
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
                  />
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="provider">{t('provider')}</Label>
                  <Select
                    value={provider}
                    onValueChange={(value: 'openai' | 'ollama') => {
                      setProvider(value);
                      if (!baseUrl || baseUrl === defaultUrls[provider]) {
                        setBaseUrl(defaultUrls[value]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="baseUrl">{t('baseUrl')}</Label>
                  <Input
                    id="baseUrl"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={defaultUrls[provider]}
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
                    placeholder={t('enterApiKey')}
                    className="w-full"
                  />
                </div>

                {/* Test Connection Button */}
                <div className="space-y-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting || !baseUrl.trim()}
                    className="w-full"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="mr-2 size-4 animate-spin" />
                        {t('testing')}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 size-4" />
                        {t('testConnection')}
                      </>
                    )}
                  </Button>
                  {testStatus === 'success' && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="size-4" />
                      <span>
                        {t('connectionSuccess', { count: models.length })}
                      </span>
                    </div>
                  )}
                  {testStatus === 'error' && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <XCircle className="size-4" />
                      <span>{testError || t('connectionFailed')}</span>
                    </div>
                  )}
                </div>

                {/* Models List */}
                {models.length > 0 && (
                  <div className="space-y-2 w-full">
                    <Label>{t('modelsList', { count: models.length })}</Label>
                    <ScrollArea className="h-[200px] w-full rounded-md border p-3 [&_[data-slot='scroll-area-scrollbar']]:hidden">
                      <div className="space-y-1">
                        {models.map((model) => (
                          <div
                            key={model.id}
                            className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-sm"
                          >
                            <span className="font-medium">{model.name}</span>
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
              disabled={!name.trim() || !baseUrl.trim()}
              className="flex-1"
            >
              {connection
                ? t('save', { ns: 'common' })
                : t('add', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
          <DialogDescription>
            {t('confirmDeleteConnection')}
            {connectionName && (
              <span className="font-semibold">{connectionName}</span>
            )}
            ?
          </DialogDescription>
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
