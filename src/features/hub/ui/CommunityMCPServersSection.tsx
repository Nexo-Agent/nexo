import { useState, useEffect } from 'react';
import { Download, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/atoms/card';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import type { HubMCPServer } from '@/features/mcp/types';
import { HubCommunitySection } from './HubCommunitySection';
import { logger } from '@/lib/logger';

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

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await invokeCommand(TauriCommands.REFRESH_HUB_INDEX);
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

  return (
    <HubCommunitySection<HubMCPServer>
      data={servers}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={handleRefresh}
      onRetry={loadServers}
      searchPlaceholder={t('searchMCPServers', {
        defaultValue: 'Search MCP servers...',
      })}
      noResultsText={t('noMCPServersFound', {
        defaultValue: 'No MCP servers found.',
      })}
      emptyIcon={Server}
      emptyTitle={t('noHubMCPServers', {
        defaultValue: 'No MCP servers available',
      })}
      emptyDescription={t('noHubMCPServersDescription', {
        defaultValue: 'No MCP servers found in the hub.',
      })}
      filterFn={(server, query) =>
        server.name.toLowerCase().includes(query.toLowerCase()) ||
        server.description.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(server) => {
        const isInstalled = installedServerIds.includes(server.id);
        return (
          <Card
            key={server.id}
            className="flex flex-col h-full hover:bg-accent/50 transition-colors"
          >
            <CardHeader className="flex-row items-center gap-3 pb-3 space-y-0">
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
                <CardTitle className="text-base truncate m-0 p-0">
                  {server.name}
                </CardTitle>
                <CardDescription className="text-xs mt-1 truncate">
                  {server.id}
                </CardDescription>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary shrink-0 uppercase">
                {server.type}
              </span>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {server.description}
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                onClick={() => onInstall(server)}
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
      }}
    />
  );
}

export type { CommunityMCPServersSectionProps };
