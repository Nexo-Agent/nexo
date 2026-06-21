import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { useAppDispatch } from '@/app/hooks';
import { DOCS_URL } from '@/features/settings/lib/constants';
import {
  useGetLLMConnectionsQuery,
  useCreateLLMConnectionMutation,
  useUpdateLLMConnectionMutation,
  useDeleteLLMConnectionMutation,
  useToggleLLMConnectionEnabledMutation,
} from '../state/api';
import type { LLMConnection } from '../types';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import { logger } from '@/lib/logger';
import { LLMConnectionCard } from './LLMConnectionCard';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { LLMConnectionDialog } from './LLMConnectionDialog';

export function LLMConnections() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();

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

  const openDocs = async () => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(DOCS_URL);
    } catch (error) {
      logger.error('Failed to open LLM docs link:', error);
    }
  };

  const handleAdd = useCallback(() => {
    setEditingConnection(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((connection: LLMConnection) => {
    setEditingConnection(connection);
    setDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
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
  }, [connectionToDelete, deleteConnection, dispatch, t]);

  const handleToggleEnabled = useCallback(
    async (connectionId: string, currentEnabled: boolean) => {
      try {
        await toggleEnabled({
          id: connectionId,
          enabled: !currentEnabled,
        }).unwrap();
      } catch (error) {
        logger.error('Error toggling LLM connection:', error);
        dispatch(showError(t('cannotToggleConnection')));
      }
    },
    [toggleEnabled, dispatch, t]
  );

  const handleSave = useCallback(
    async (connection: Omit<LLMConnection, 'id'>) => {
      try {
        if (editingConnection) {
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
          await createConnection(connection).unwrap();
          dispatch(
            showSuccess(t('connectionSaved'), t('newConnectionCreated'))
          );
        }

        setDialogOpen(false);
        setEditingConnection(null);
      } catch (error) {
        logger.error('Error saving LLM connection:', error);
        dispatch(showError(t('cannotSaveConnection')));
      }
    },
    [editingConnection, updateConnection, createConnection, dispatch, t]
  );

  const handleDelete = useCallback(() => {
    if (editingConnection) {
      setConnectionToDelete(editingConnection.id);
      setDialogOpen(false);
      setDeleteDialogOpen(true);
    }
  }, [editingConnection]);

  return (
    <div className="space-y-5 pb-6">
      <p className="-mt-1 text-sm leading-relaxed text-muted-foreground">
        {t('llmPageDescription')}{' '}
        <button
          type="button"
          onClick={() => void openDocs()}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t('learnMore')}
        </button>
      </p>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">{t('connections')}</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          data-tour="llm-add-btn"
        >
          <Plus className="size-4" />
          {t('addConnection')}
        </Button>
      </div>

      {llmConnections.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t('noConnections')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {llmConnections.map((connection) => (
            <LLMConnectionCard
              key={connection.id}
              connection={connection}
              onEdit={handleEdit}
              onToggleEnabled={handleToggleEnabled}
            />
          ))}
        </div>
      )}

      <LLMConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connection={editingConnection}
        onSave={handleSave}
        onDelete={editingConnection ? handleDelete : undefined}
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
