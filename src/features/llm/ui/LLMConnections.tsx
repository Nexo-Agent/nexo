import { useState, useCallback } from 'react';
import { Plus, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { EmptyState } from '@/ui/atoms/empty-state';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { useAppDispatch } from '@/app/hooks';
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
import { SectionHeader } from '@/ui/molecules/SectionHeader';
import { LLMConnectionCard } from './LLMConnectionCard';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { LLMConnectionDialog } from './LLMConnectionDialog';

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
        // No toast notification for toggle action
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
    <div className="space-y-6">
      <SectionHeader>
        <Button onClick={handleAdd} size="sm" data-tour="llm-add-btn">
          <Plus className="mr-2 size-4" />
          {t('addConnection')}
        </Button>
      </SectionHeader>

      {llmConnections.length === 0 ? (
        <EmptyState icon={Network} title={t('noConnections')} />
      ) : (
        <ScrollArea className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {llmConnections.map((connection) => (
              <LLMConnectionCard
                key={connection.id}
                connection={connection}
                onEdit={handleEdit}
                onToggleEnabled={handleToggleEnabled}
              />
            ))}
          </div>
        </ScrollArea>
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
