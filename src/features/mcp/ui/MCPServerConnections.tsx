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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/atoms/tooltip';
import { Skeleton } from '@/ui/atoms/skeleton';
import { HeadersEditor } from '@/features/settings';
import { useAppDispatch } from '@/app/hooks';
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

import type { MCPToolType, MCPServerConnection } from '../types';

import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { logger } from '@/lib/logger';

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

  // RTK Query Hooks
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
      // Reset loading state when dialog closes
      setRuntimesLoading(false);
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
      // Update status to "connecting" immediately before starting connection
      await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
        id: connection.id,
        status: 'connecting',
        toolsJson: null,
        errorMessage: null,
      });

      // Invalidate cache to update UI immediately
      refetchConnections();

      // Start connection in background (don't await to avoid blocking UI)
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

  const handleSave = async (connection: Omit<MCPServerConnection, 'id'>) => {
    try {
      if (editingConnection) {
        // Update existing connection
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

        // Close dialog immediately
        setDialogOpen(false);
        setEditingConnection(null);

        // Show success notification
        dispatch(showSuccess(t('connectionSaved'), t('mcpConnectionUpdated')));

        // If connection needs reconnect
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

        return; // Exit early for updates
      } else {
        // Create new connection
        const result = await createConnection(connection).unwrap();

        // Close dialog immediately
        setDialogOpen(false);
        setEditingConnection(null);

        // Show success notification
        dispatch(
          showSuccess(t('connectionSaved'), t('newMCPConnectionCreated'))
        );

        // Start async connection immediately in background
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

        return; // Exit early for new connections
      }
    } catch (error) {
      logger.error('Error saving MCP connection:', error);
      dispatch(showError(t('cannotSaveConnection')));
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-end shrink-0">
        <Button onClick={handleAdd} size="sm">
          <Plus className="mr-2 size-4" />
          {t('addConnection')}
        </Button>
      </div>

      {mcpConnections.length === 0 ? (
        <EmptyState icon={Server} title={t('noConnections')} />
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mcpConnections.map((connection) => (
              <div
                key={connection.id}
                onClick={() => handleEdit(connection)}
                className="group relative rounded-lg border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-[box-shadow,border-color] duration-200 cursor-pointer overflow-hidden"
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                <div className="relative space-y-3">
                  {/* Header with icon and name */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      <Server className="size-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-normal truncate">
                          {connection.name}
                        </span>
                        {connection.errorMessage && (
                          <TooltipProvider>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <AlertCircle className="size-4 text-destructive shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-sm">
                                  {connection.errorMessage}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        {connection.type}
                      </p>
                    </div>
                    <div
                      className="flex gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {connection.status === 'connected' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleDisconnect(connection)}
                          title={t('disconnectConnection')}
                        >
                          <PowerOff className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleReload(connection)}
                        title={t('reloadConnection')}
                        disabled={connection.status === 'connecting'}
                      >
                        <RefreshCw
                          className={`size-3.5 ${connection.status === 'connecting' ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    </div>
                  </div>

                  {/* Status and URL */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {connection.status && (
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs ${
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
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {connection.url}
                    </p>
                  </div>

                  {/* Tools list - Fixed height to prevent layout shift */}
                  <div className="flex items-center gap-1.5 overflow-hidden min-h-[28px]">
                    {connection.tools && connection.tools.length > 0 ? (
                      <>
                        <div className="flex gap-1.5 overflow-hidden">
                          {connection.tools
                            .slice(0, 3)
                            .map((tool: MCPToolType, index: number) => (
                              <span
                                key={index}
                                className="inline-flex items-center rounded-md bg-muted/60 px-2 py-1 text-xs text-foreground/80 group-hover:bg-muted transition-colors whitespace-nowrap"
                              >
                                {tool.name}
                              </span>
                            ))}
                        </div>
                        {connection.tools.length > 3 && (
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs text-primary font-medium whitespace-nowrap shrink-0">
                            +{connection.tools.length - 3}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground/60 whitespace-nowrap">
                        {t('noTools', { defaultValue: 'No tools' })}
                      </span>
                    )}
                  </div>
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

// Skeleton component for runtime selector loading state
function RuntimeSelectorSkeleton() {
  return (
    <div className="space-y-2 w-full">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-full" />
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
  runtimesLoading: boolean;
}

function MCPServerConnectionDialog({
  open,
  onOpenChange,
  connection,
  onSave,
  onDelete,
  pythonRuntimes,
  nodeRuntimes,
  runtimesLoading,
}: MCPServerConnectionDialogProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const [name, setName] = useState(connection?.name || '');
  const [url, setUrl] = useState(connection?.url || '');
  const [type, setType] = useState<'sse' | 'stdio' | 'http-streamable'>(
    connection?.type || 'sse'
  );
  const [headers, setHeaders] = useState(connection?.headers || '');
  const [envVars, setEnvVars] = useState(connection?.env_vars || '');
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
      setEnvVars(connection.env_vars || '');
    } else {
      setName('');
      setUrl('');
      setType('sse');
      setHeaders('');
      setEnvVars('');
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
        headers: headers?.trim() || '',
        env_vars: envVars?.trim() || '',
        runtime_path: selectedRuntime !== 'default' ? selectedRuntime : '',
      });
      onOpenChange(false);
    }
  };

  const handleHeadersChange = (value: string | undefined) => {
    setHeaders(value || '');
  };

  const handleEnvVarsChange = (value: string | undefined) => {
    setEnvVars(value || '');
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
  const showEnvVars = type === 'stdio';
  const showRuntimeSelector = type === 'stdio';

  // Helper to check if runtime is ready
  const hasInstalledRuntimes =
    pythonRuntimes.some((r) => r.installed) ||
    nodeRuntimes.some((r) => r.installed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {connection ? t('editConnection') : t('addNewConnection')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('configureMCPConnection')}
          </p>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden w-full"
        >
          <DialogBody className="[&>div]:px-0 [&>div]:py-0 w-full">
            <div className="space-y-6 py-2 pb-6 w-full">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="mcp-name" className="text-sm font-medium">
                    {t('connectionName')}
                  </Label>
                  <Input
                    id="mcp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('mcpConnectionNamePlaceholder')}
                    className="w-full h-9"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcp-type" className="text-sm font-medium">
                    {t('type')}
                  </Label>
                  <Select
                    value={type}
                    onValueChange={(
                      value: 'sse' | 'stdio' | 'http-streamable'
                    ) => setType(value)}
                  >
                    <SelectTrigger id="mcp-type" className="w-full h-9">
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
              </div>

              {/* Runtime and Command Support */}
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                {showRuntimeSelector &&
                  (runtimesLoading ? (
                    <RuntimeSelectorSkeleton />
                  ) : hasInstalledRuntimes ? (
                    <div className="space-y-2 w-full">
                      <Label className="text-sm font-medium">
                        {t('runtimeEnvironment')}
                      </Label>
                      <Select
                        value={selectedRuntime}
                        onValueChange={handleRuntimeChange}
                      >
                        <SelectTrigger className="w-full h-9 bg-background">
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
                  ) : null)}

                <div className="space-y-2 w-full">
                  <Label htmlFor="mcp-url" className="text-sm font-medium">
                    {type === 'stdio'
                      ? runtimePrefix
                        ? t('mcpArguments')
                        : t('mcpCommand')
                      : t('url')}
                  </Label>
                  <div className="flex gap-2 items-center">
                    {type === 'stdio' && runtimePrefix && (
                      <span className="bg-muted px-2.5 py-1.5 rounded-md text-xs font-mono border whitespace-nowrap">
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
                      className="w-full h-9 bg-background"
                      required
                    />
                  </div>
                </div>

                {showEnvVars && (
                  <div
                    className={`w-full ${envVars ? 'border-t pt-4 mt-2' : 'mt-2'}`}
                  >
                    <HeadersEditor
                      value={envVars}
                      onChange={handleEnvVarsChange}
                      label={t('envVarsOptional', {
                        defaultValue: 'Environment Variables (Optional)',
                      })}
                      placeholderKey="VAR_NAME"
                      placeholderValue="value"
                      helperText={t('envVarsInfo', {
                        defaultValue:
                          'Passed as environment variables to the stdio process.',
                      })}
                    />
                  </div>
                )}

                {showHeaders && (
                  <div
                    className={`w-full ${headers ? 'border-t pt-4 mt-2' : 'mt-2'}`}
                  >
                    <HeadersEditor
                      value={headers}
                      onChange={handleHeadersChange}
                    />
                  </div>
                )}
              </div>

              {/* Tools List */}
              <ScrollArea className="space-y-4 border-t pt-4 h-full">
                {connection?.tools && connection.tools.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t('toolsList', { count: connection.tools.length })}
                    </Label>
                    <div className="rounded-md border bg-muted/20 overflow-hidden">
                      <div className="max-h-[200px] overflow-y-auto divide-y divide-border">
                        {connection.tools.map((tool, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 text-sm hover:bg-muted/30 transition-colors"
                          >
                            <div className="font-medium text-foreground">
                              {tool.name}
                            </div>
                            {tool.description && (
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {tool.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogBody>
          <DialogFooter className="shrink-0 flex flex-row gap-2 border-t pt-4">
            <Button type="submit" className="flex-1">
              {tCommon('save')}
            </Button>
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tCommon('delete')}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteConnection')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('deleteConnectionConfirm', { name: connectionName })}
          </p>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('delete', { ns: 'common' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
