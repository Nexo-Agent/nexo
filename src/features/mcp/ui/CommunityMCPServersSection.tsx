import { useState, useEffect } from 'react';
import { Download, Loader2, Server, RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';
import { Button } from '@/ui/atoms/button/button';
import { Input } from '@/ui/atoms/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/atoms/card';
import { EmptyState } from '@/ui/atoms/empty-state';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import type { HubMCPServer } from '../types';

interface CommunityMCPServersSectionProps {
  installedServerIds: string[];
  onInstall: (server: HubMCPServer) => void;
}

export function CommunityMCPServersSection({
  installedServerIds,
  onInstall,
}: CommunityMCPServersSectionProps) {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const [servers, setServers] = useState<HubMCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadServers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invokeCommand<HubMCPServer[]>(
        TauriCommands.FETCH_HUB_MCP_SERVERS
      );
      setServers(data);
    } catch (err) {
      logger.error('Error loading hub MCP servers:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to load MCP servers from hub';
      setError(errorMessage);
      dispatch(showError(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = (server: HubMCPServer) => {
    onInstall(server);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      // Refresh hub index first
      await invokeCommand(TauriCommands.REFRESH_HUB_INDEX);
      // Then reload servers
      await loadServers();
      dispatch(
        showSuccess(
          t('hubIndexRefreshed', {
            defaultValue: 'Hub index refreshed successfully',
          })
        )
      );
    } catch (err) {
      logger.error('Error refreshing hub index:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to refresh hub index';
      dispatch(showError(errorMessage));
    } finally {
      setRefreshing(false);
    }
  };

  const filteredServers = servers.filter(
    (server) =>
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="mr-2 size-4 animate-spin" />
        <p className="text-sm text-muted-foreground">
          {t('loadingHubMCPServers', {
            defaultValue: 'Loading MCP servers...',
          })}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/10">
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button onClick={loadServers} size="sm" variant="outline">
          {t('retry', { ns: 'common', defaultValue: 'Retry' })}
        </Button>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title={t('noHubMCPServers', {
          defaultValue: 'No MCP servers available',
        })}
        description={t('noHubMCPServersDescription', {
          defaultValue: 'No MCP servers found in the hub.',
        })}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchMCPServers', {
              defaultValue: 'Search MCP servers...',
            })}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          size="sm"
          variant="outline"
        >
          <RefreshCw
            className={`mr-2 size-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          {t('refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        {filteredServers.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">
              {t('noMCPServersFound', {
                defaultValue: 'No MCP servers found.',
              })}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {filteredServers.map((server) => {
              const isInstalled = installedServerIds.includes(server.id);
              return (
                <Card
                  key={server.id}
                  className="flex flex-col h-full hover:bg-accent/50 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      {server.icon ? (
                        <img
                          src={server.icon}
                          alt={server.name}
                          className="size-10 rounded-md object-cover bg-muted/20 p-1"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="rounded-lg bg-primary/10 p-2.5">
                          <Server className="size-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {server.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 truncate">
                          {server.id}
                        </CardDescription>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary shrink-0 uppercase">
                        {server.type}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {server.description}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button
                      onClick={() => handleInstall(server)}
                      disabled={isInstalled}
                      className="w-full"
                      size="sm"
                      variant={isInstalled ? 'outline' : 'default'}
                    >
                      {isInstalled ? (
                        <>
                          <Server className="mr-2 size-4" />
                          {t('installed', { defaultValue: 'Installed' })}
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 size-4" />
                          {t('install', { defaultValue: 'Install' })}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export type { CommunityMCPServersSectionProps };
