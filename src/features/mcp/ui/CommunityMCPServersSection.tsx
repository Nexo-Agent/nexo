import { useCallback } from 'react';
import { Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import {
  useGetHubMCPServersQuery,
  useRefreshHubIndexMutation,
} from '../state/api';
import type { HubMCPServer } from '../types';
import { MCPServerCard } from './MCPServerCard';
import { HubCommunitySection } from '@/features/hub/ui/HubCommunitySection';

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

  const {
    data: servers = [],
    isLoading,
    error,
    refetch,
  } = useGetHubMCPServersQuery();

  const [refreshHub, { isLoading: isRefreshing }] =
    useRefreshHubIndexMutation();

  const handleRefresh = async () => {
    try {
      await refreshHub().unwrap();
      // Tag invalidation handles the refetch, but we can verify
      await refetch();
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
    }
  };

  const errorMessage = error
    ? (error as { message?: string }).message || 'Failed to load MCP servers'
    : null;

  const filterFn = useCallback(
    (server: HubMCPServer, query: string) =>
      server.name.toLowerCase().includes(query.toLowerCase()) ||
      server.description.toLowerCase().includes(query.toLowerCase()),
    []
  );

  const renderItem = useCallback(
    (server: HubMCPServer) => (
      <MCPServerCard
        key={server.id}
        server={server}
        isInstalled={installedServerIds.includes(server.id)}
        onInstall={onInstall}
      />
    ),
    [installedServerIds, onInstall]
  );

  return (
    <HubCommunitySection<HubMCPServer>
      data={servers}
      loading={isLoading}
      refreshing={isRefreshing}
      error={errorMessage}
      onRefresh={handleRefresh}
      onRetry={refetch}
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
      filterFn={filterFn}
      renderItem={renderItem}
    />
  );
}

export type { CommunityMCPServersSectionProps };
