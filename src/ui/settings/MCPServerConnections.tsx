import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Server,
  PowerOff,
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
import { HeadersEditor } from '@/ui/settings/HeadersEditor';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addMCPConnection,
  updateMCPConnection,
  removeMCPConnection,
  connectMCPConnection,
  disconnectMCPConnection,
} from '@/store/slices/mcpConnectionsSlice';
import { refreshMCPConnections } from '@/store/slices/mcpConnectionsSlice';
import { showError, showSuccess } from '@/store/slices/notificationSlice';
import type { MCPToolType, MCPServerConnection } from '@/lib/mcp/types';

import { invokeCommand, TauriCommands } from '@/lib/tauri';

interface PythonRuntimeStatus {
  version: string;
  installed: boolean;
  path: string | null;
}

interface NodeRuntimeStatus {
  version: string;
  installed: boolean;
  path: string | null;
}

export function MCPServerConnections() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const mcpConnections = useAppSelector(
    (state) => state.mcpConnections.mcpConnections
  );
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

  React.useEffect(() => {
    const loadRuntimes = async () => {
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
        console.error('Failed to load runtimes:', error);
      }
    };
    if (dialogOpen) {
      loadRuntimes();
    }
  }, [dialogOpen]);

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
      await dispatch(removeMCPConnection(connectionToDelete)).unwrap();
      // Refresh connections from database
      await dispatch(refreshMCPConnections()).unwrap();
      setDeleteDialogOpen(false);
      setConnectionToDelete(null);
      dispatch(
        showSuccess(t('connectionDeleted'), t('connectionDeletedDescription'))
      );
    } catch (error) {
      console.error('Error deleting MCP connection:', error);
      dispatch(showError(t('cannotDeleteConnection')));
    }
  };

  const handleReload = async (connection: MCPServerConnection) => {
    try {
      await dispatch(
        connectMCPConnection({
          id: connection.id,
          url: connection.url,
          type: connection.type,
          headers: connection.headers,
          runtime_path: connection.runtime_path,
        })
      ).unwrap();

      // Refresh connections to get updated status
      await dispatch(refreshMCPConnections()).unwrap();

      dispatch(
        showSuccess(
          t('connectionReloaded', { name: connection.name }),
          t('connectionReloadedDescription')
        )
      );
    } catch (error) {
      console.error('Error reloading MCP connection:', error);
      dispatch(showError(t('cannotReloadConnection')));
    }
  };

  const handleDisconnect = async (connection: MCPServerConnection) => {
    try {
      await dispatch(disconnectMCPConnection(connection.id)).unwrap();

      // Refresh connections to get updated status
      await dispatch(refreshMCPConnections()).unwrap();

      dispatch(
        showSuccess(
          t('connectionDisconnected', { name: connection.name }),
          t('connectionDisconnectedDescription')
        )
      );
    } catch (error) {
      console.error('Error disconnecting MCP connection:', error);
      dispatch(showError(t('cannotDisconnectConnection')));
    }
  };

  const handleSave = async (connection: Omit<MCPServerConnection, 'id'>) => {
    try {
      if (editingConnection) {
        // Update existing connection
        const updateResult = await dispatch(
          updateMCPConnection({
            id: editingConnection.id,
            connection: {
              name: connection.name,
              url: connection.url,
              type: connection.type,
              headers: connection.headers,
              runtime_path: connection.runtime_path,
              tools: connection.tools,
            },
          })
        ).unwrap();

        // Close dialog immediately
        setDialogOpen(false);
        setEditingConnection(null);

        // Show success notification
        dispatch(showSuccess(t('connectionSaved'), t('mcpConnectionUpdated')));

        // If connection needs reconnect, trigger async connection immediately
        if (updateResult.updates.status === 'connecting') {
          dispatch(
            connectMCPConnection({
              id: editingConnection.id,
              url: connection.url,
              type: connection.type,
              headers: connection.headers,
              runtime_path: connection.runtime_path,
            })
          ).catch((error) => {
            console.error('Error reconnecting MCP server:', error);
          });
        }

        return; // Exit early for updates
      } else {
        // Create new connection - this returns immediately with "connecting" status
        const result = await dispatch(addMCPConnection(connection)).unwrap();

        // Close dialog immediately after saving to DB
        setDialogOpen(false);
        setEditingConnection(null);

        // Show success notification
        dispatch(
          showSuccess(t('connectionSaved'), t('newMCPConnectionCreated'))
        );

        // Start async connection immediately in background (don't await)
        dispatch(
          connectMCPConnection({
            id: result.id,
            url: connection.url,
            type: connection.type,
            headers: connection.headers,
            runtime_path: connection.runtime_path,
          })
        ).catch((error) => {
          console.error('Error connecting MCP server:', error);
        });

        return; // Exit early for new connections
      }

      // For updates, refresh and close
      await dispatch(refreshMCPConnections()).unwrap();
      setDialogOpen(false);
      setEditingConnection(null);

      // Show success notification
      dispatch(showSuccess(t('connectionSaved'), t('mcpConnectionUpdated')));
    } catch (error) {
      console.error('Error saving MCP connection:', error);
      dispatch(showError(t('cannotSaveConnection')));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">
            {t('mcpServerConnections')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('manageMCPServerConnections')}
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="mr-2 size-4" />
          {t('addConnection')}
        </Button>
      </div>

      {mcpConnections.length === 0 ? (
        <EmptyState
          icon={Server}
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
            {mcpConnections.map((connection) => (
              <div
                key={connection.id}
                onClick={() => handleEdit(connection)}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{connection.name}</h4>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {connection.type}
                    </span>
                    {connection.status && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          connection.status === 'connected'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : connection.status === 'connecting'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}
                      >
                        {connection.status === 'connected'
                          ? t('connected')
                          : connection.status === 'connecting'
                            ? t('connecting')
                            : t('disconnected')}
                      </span>
                    )}
                    {connection.tools && connection.tools.length > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {connection.tools.length} {t('tools')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {connection.url}
                  </p>
                  {connection.errorMessage && (
                    <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive">
                        {connection.errorMessage}
                      </p>
                    </div>
                  )}
                  {connection.tools && connection.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {connection.tools
                        .slice(0, 5)
                        .map((tool: MCPToolType, index: number) => (
                          <span
                            key={index}
                            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {tool.name}
                          </span>
                        ))}
                      {connection.tools.length > 5 && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {t('moreTools', {
                            count: connection.tools.length - 5,
                          })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className="flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {connection.status === 'connected' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDisconnect(connection)}
                      title={t('disconnectConnection')}
                    >
                      <PowerOff className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleReload(connection)}
                    title={t('reloadConnection')}
                    disabled={connection.status === 'connecting'}
                  >
                    <RefreshCw
                      className={`size-4 ${connection.status === 'connecting' ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
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

interface MCPServerConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: MCPServerConnection | null;
  onSave: (connection: Omit<MCPServerConnection, 'id'>) => void;
  onDelete?: () => void;
  pythonRuntimes: PythonRuntimeStatus[];
  nodeRuntimes: NodeRuntimeStatus[];
}

function MCPServerConnectionDialog({
  open,
  onOpenChange,
  connection,
  onSave,
  onDelete,
  pythonRuntimes,
  nodeRuntimes,
}: MCPServerConnectionDialogProps) {
  const { t } = useTranslation('settings');
  const [name, setName] = useState(connection?.name || '');
  const [url, setUrl] = useState(connection?.url || '');
  const [type, setType] = useState<'sse' | 'stdio' | 'http-streamable'>(
    connection?.type || 'sse'
  );
  const [headers, setHeaders] = useState(connection?.headers || '');
  const [selectedRuntime, setSelectedRuntime] = useState<string>('default');

  React.useEffect(() => {
    if (connection) {
      setName(connection.name);
      const rtPath = connection.runtime_path || 'default';
      setSelectedRuntime(rtPath);

      const isPy = pythonRuntimes.some((r) => r.path === rtPath);
      const isNode = nodeRuntimes.some((r) => r.path === rtPath);
      let displayUrl = connection.url;

      if (isPy && displayUrl.startsWith('uv ')) {
        displayUrl = displayUrl.substring(3);
      } else if (isNode && displayUrl.startsWith('npx ')) {
        displayUrl = displayUrl.substring(4);
      }

      setUrl(displayUrl);
      setType(connection.type);
      setHeaders(connection.headers || '');
    } else {
      setName('');
      setUrl('');
      setType('sse');
      setHeaders('');
      setSelectedRuntime('default');
    }
  }, [connection, open, pythonRuntimes, nodeRuntimes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && url.trim()) {
      let finalUrl = url.trim();
      const isPy = pythonRuntimes.some((r) => r.path === selectedRuntime);
      const isNode = nodeRuntimes.some((r) => r.path === selectedRuntime);

      if (isPy && !finalUrl.startsWith('uv ')) {
        finalUrl = `uv ${finalUrl}`;
      } else if (isNode && !finalUrl.startsWith('npx ')) {
        finalUrl = `npx ${finalUrl}`;
      }

      onSave({
        name: name.trim(),
        url: finalUrl,
        type,
        headers: headers?.trim() || undefined,
        runtime_path:
          selectedRuntime !== 'default' ? selectedRuntime : undefined,
      });
      onOpenChange(false);
    }
  };

  const handleHeadersChange = (value: string | undefined) => {
    setHeaders(value || '');
  };

  const handleRuntimeChange = (value: string) => {
    const isNewPy = pythonRuntimes.some((r) => r.path === value);
    const isNewNode = nodeRuntimes.some((r) => r.path === value);

    let newUrl = url;
    if (isNewPy && newUrl.startsWith('uv ')) {
      newUrl = newUrl.substring(3);
    } else if (isNewNode && newUrl.startsWith('npx ')) {
      newUrl = newUrl.substring(4);
    }

    setUrl(newUrl);
    setSelectedRuntime(value);
  };

  // Helper content for prefixes
  const isPython = pythonRuntimes.some((r) => r.path === selectedRuntime);
  const isNode = nodeRuntimes.some((r) => r.path === selectedRuntime);
  const runtimePrefix = isPython ? 'uv' : isNode ? 'npx' : undefined;

  const showHeaders = type === 'sse' || type === 'http-streamable';
  const showRuntimeSelector = type === 'stdio';

  // Helper to check if runtime is ready
  const hasInstalledRuntimes =
    pythonRuntimes.some((r) => r.installed) ||
    nodeRuntimes.some((r) => r.installed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {connection ? t('editConnection') : t('addNewConnection')}
            </DialogTitle>
            <DialogDescription>{t('configureMCPConnection')}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ScrollArea className="h-full [&_[data-slot='scroll-area-scrollbar']]:hidden">
              <div className="space-y-4 pr-4">
                <div className="space-y-2 w-full">
                  <Label htmlFor="mcp-name">{t('connectionName')}</Label>
                  <Input
                    id="mcp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('mcpConnectionNamePlaceholder')}
                    className="w-full"
                    required
                  />
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="mcp-type">{t('type')}</Label>
                  <Select
                    value={type}
                    onValueChange={(
                      value: 'sse' | 'stdio' | 'http-streamable'
                    ) => setType(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sse">{t('sseType')}</SelectItem>
                      <SelectItem value="stdio">{t('stdioType')}</SelectItem>
                      <SelectItem value="http-streamable">
                        {t('httpStreamableType')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showRuntimeSelector && hasInstalledRuntimes && (
                  <div className="space-y-2 w-full">
                    <Label>{t('runtimeEnvironment')}</Label>
                    <Select
                      value={selectedRuntime}
                      onValueChange={handleRuntimeChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('systemDefault')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">
                          {t('systemDefault')}
                        </SelectItem>
                        {pythonRuntimes
                          .filter((r) => r.installed && r.path)
                          .map((r) => (
                            <SelectItem key={r.version} value={r.path || ''}>
                              Python {r.version} (Bundled)
                            </SelectItem>
                          ))}
                        {nodeRuntimes
                          .filter((r) => r.installed && r.path)
                          .map((r) => (
                            <SelectItem key={r.version} value={r.path || ''}>
                              Node.js {r.version} (Bundled)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2 w-full">
                  <Label htmlFor="mcp-url">
                    {type === 'stdio'
                      ? runtimePrefix
                        ? t('mcpArguments')
                        : t('mcpCommand')
                      : t('url')}
                  </Label>
                  <div className="flex gap-2 items-center">
                    {type === 'stdio' && runtimePrefix && (
                      <span className="bg-muted px-3 py-2 rounded-md text-sm font-mono border whitespace-nowrap">
                        {runtimePrefix}
                      </span>
                    )}
                    <Input
                      id="mcp-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={
                        type === 'stdio'
                          ? runtimePrefix
                            ? t('mcpArgumentsPlaceholder')
                            : t('stdioUrlPlaceholder')
                          : t('sseUrlPlaceholder')
                      }
                      className="w-full"
                      required
                    />
                  </div>
                </div>
                {showHeaders && (
                  <div className="w-full">
                    <HeadersEditor
                      value={headers}
                      onChange={handleHeadersChange}
                    />
                  </div>
                )}

                {/* Info message */}
                <div className="text-sm text-muted-foreground">
                  {t('mcpAutoConnectInfo')}
                </div>

                {/* Tools List - Show if connection exists and has tools */}
                {connection?.tools && connection.tools.length > 0 && (
                  <div className="space-y-2 w-full">
                    <Label>
                      {t('toolsList', { count: connection.tools.length })}
                    </Label>
                    <div className="max-h-[200px] w-full rounded-md border p-3 overflow-y-auto">
                      <div className="space-y-1">
                        {connection.tools.map((tool, index) => (
                          <div
                            key={index}
                            className="flex flex-col gap-1 rounded-md bg-muted px-2 py-1.5 text-sm"
                          >
                            <span className="font-medium">{tool.name}</span>
                            {tool.description && (
                              <span className="text-xs text-muted-foreground wrap-break-word">
                                {tool.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
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
              disabled={!name.trim() || !url.trim()}
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
