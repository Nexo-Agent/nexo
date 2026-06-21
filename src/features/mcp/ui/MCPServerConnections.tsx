import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { ConfirmDialog } from '@/ui/molecules/ConfirmDialog';
import { useAppDispatch } from '@/app/hooks';
import { DOCS_URL } from '@/features/settings/lib/constants';
import { MCPServerConnectionCard } from './MCPServerConnectionCard';
import { MCPServerConnectionDialog } from './MCPServerConnectionDialog';
import {
  useGetMCPConnectionsQuery,
  useCreateMCPConnectionMutation,
  useConnectMCPConnectionMutation,
  useDisconnectMCPConnectionMutation,
  useUpdateMCPConnectionMutation,
  useRemoveMCPConnectionMutation,
} from '../hooks/useMCPConnections';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';

import type {
  MCPServerConnection,
  PythonRuntimeStatus,
  NodeRuntimeStatus,
} from '../types';

import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { logger } from '@/lib/logger';

export function MCPServerConnections() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();

  const { data: mcpConnections = [], refetch: refetchConnections } =
    useGetMCPConnectionsQuery();
  const [createConnection] = useCreateMCPConnectionMutation();
  const [connectConnection] = useConnectMCPConnectionMutation();
  const [disconnectConnection] = useDisconnectMCPConnectionMutation();
  const [updateConnection] = useUpdateMCPConnectionMutation();
  const [removeConnection] = useRemoveMCPConnectionMutation();

  const [editingConnection, setEditingConnection] =
    useState<MCPServerConnection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(
    null
  );
  const [pythonRuntimes, setPythonRuntimes] = useState<PythonRuntimeStatus[]>(
    []
  );
  const [nodeRuntimes, setNodeRuntimes] = useState<NodeRuntimeStatus[]>([]);
  const [runtimesLoading, setRuntimesLoading] = useState(false);

  React.useEffect(() => {
    const loadRuntimes = async () => {
      setRuntimesLoading(true);
      try {
        const [pyStatus, nodeStatus] = await Promise.all([
          invokeCommand<PythonRuntimeStatus[]>(
            TauriCommands.GET_PYTHON_RUNTIMES_STATUS
          ),
          invokeCommand<NodeRuntimeStatus[]>(
            TauriCommands.GET_NODE_RUNTIMES_STATUS
          ),
        ]);
        setPythonRuntimes(pyStatus);
        setNodeRuntimes(nodeStatus);
      } catch (error) {
        logger.error('Failed to load runtimes:', error);
      } finally {
        setRuntimesLoading(false);
      }
    };
    if (dialogOpen) {
      loadRuntimes();
    } else {
      setRuntimesLoading(false);
    }
  }, [dialogOpen]);

  const openDocs = async () => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(DOCS_URL);
    } catch (error) {
      logger.error('Failed to open MCP docs link:', error);
    }
  };

  const handleAdd = () => {
    setEditingConnection(null);
    setDialogOpen(true);
  };

  const handleEdit = (connection: MCPServerConnection) => {
    setEditingConnection(connection);
    setDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!connectionToDelete) return;

    try {
      await removeConnection(connectionToDelete).unwrap();
      setDeleteDialogOpen(false);
      setConnectionToDelete(null);
      dispatch(
        showSuccess(t('connectionDeleted'), t('connectionDeletedDescription'))
      );
    } catch (error) {
      logger.error('Error deleting MCP connection:', error);
      dispatch(showError(t('cannotDeleteConnection')));
    }
  };

  const handleReload = async (connection: MCPServerConnection) => {
    try {
      await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
        id: connection.id,
        status: 'connecting',
        toolsJson: null,
        errorMessage: null,
      });

      refetchConnections();

      connectConnection({
        id: connection.id,
        url: connection.url,
        type: connection.type,
        headers: connection.headers,
        env_vars: connection.env_vars,
        runtime_path: connection.runtime_path,
      }).catch((error) => {
        logger.error('Error reloading MCP connection:', error);
        dispatch(showError(t('cannotReloadConnection')));
      });
    } catch (error) {
      logger.error('Error updating MCP status:', error);
      dispatch(showError(t('cannotReloadConnection')));
    }
  };

  const handleDisconnect = async (connection: MCPServerConnection) => {
    try {
      await disconnectConnection(connection.id).unwrap();

      dispatch(
        showSuccess(
          t('connectionDisconnected', { name: connection.name }),
          t('connectionDisconnectedDescription')
        )
      );
    } catch (error) {
      logger.error('Error disconnecting MCP connection:', error);
      dispatch(showError(t('cannotDisconnectConnection')));
    }
  };

  const handleToggle = (connection: MCPServerConnection, enabled: boolean) => {
    if (enabled) {
      void handleReload(connection);
    } else {
      void handleDisconnect(connection);
    }
  };

  const handleSave = async (connection: Omit<MCPServerConnection, 'id'>) => {
    try {
      if (editingConnection) {
        const result = await updateConnection({
          id: editingConnection.id,
          connection: {
            name: connection.name,
            url: connection.url,
            type: connection.type,
            headers: connection.headers,
            env_vars: connection.env_vars,
            runtime_path: connection.runtime_path,
            tools: connection.tools,
          },
        }).unwrap();

        setDialogOpen(false);
        setEditingConnection(null);

        dispatch(showSuccess(t('connectionSaved'), t('mcpConnectionUpdated')));

        if (result.needsReconnect) {
          connectConnection({
            id: editingConnection.id,
            url: connection.url,
            type: connection.type,
            headers: connection.headers,
            env_vars: connection.env_vars,
            runtime_path: connection.runtime_path,
          }).catch((error) => {
            logger.error('Error reconnecting MCP server:', error);
          });
        }

        return;
      }

      const result = await createConnection(connection).unwrap();

      setDialogOpen(false);
      setEditingConnection(null);

      dispatch(showSuccess(t('connectionSaved'), t('newMCPConnectionCreated')));

      connectConnection({
        id: result.id,
        url: connection.url,
        type: connection.type,
        headers: connection.headers,
        env_vars: connection.env_vars,
        runtime_path: connection.runtime_path,
      }).catch((error) => {
        logger.error('Error connecting MCP server:', error);
      });
    } catch (error) {
      logger.error('Error saving MCP connection:', error);
      dispatch(showError(t('cannotSaveConnection')));
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <p className="-mt-1 text-sm leading-relaxed text-muted-foreground">
        {t('mcpPageDescription')}{' '}
        <button
          type="button"
          onClick={() => void openDocs()}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t('learnMore')}
        </button>
      </p>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">{t('servers')}</h2>
        <Button variant="secondary" size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          {t('addConnection')}
        </Button>
      </div>

      {mcpConnections.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t('noConnections')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {mcpConnections.map((connection) => (
            <MCPServerConnectionCard
              key={connection.id}
              connection={connection}
              onEdit={handleEdit}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      <MCPServerConnectionDialog
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
        pythonRuntimes={pythonRuntimes}
        nodeRuntimes={nodeRuntimes}
        runtimesLoading={runtimesLoading}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        connectionName={
          mcpConnections.find((c) => c.id === connectionToDelete)?.name
        }
      />
    </div>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  connectionName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  connectionName?: string;
}) {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('deleteConnection')}
      description={t('deleteConnectionConfirm', { name: connectionName })}
      onConfirm={onConfirm}
      confirmLabel={t('delete', { ns: 'common' })}
      cancelLabel={t('cancel', { ns: 'common' })}
      variant="destructive"
    />
  );
}
