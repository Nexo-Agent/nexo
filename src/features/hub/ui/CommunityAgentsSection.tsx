import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Check } from 'lucide-react';
import { Button } from '@/ui/atoms/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/atoms/card';

import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import { InstallAgentDialog } from './InstallAgentDialog';
import type { HubAgent } from '@/features/agent/types';
import { useGetInstalledAgentsQuery } from '@/features/agent/state/api';
import { HubCommunitySection } from './HubCommunitySection';
import { useGetHubAgentsQuery, useRefreshHubIndexMutation } from '../state/api';
import { logger } from '@/lib/logger';

export function CommunityAgentsSection({
  onInstalled,
}: {
  onInstalled?: () => void;
}) {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const [selectedAgent, setSelectedAgent] = useState<HubAgent | null>(null);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);

  // Fetch installed agents to check status
  const { data: installedAgents = [] } = useGetInstalledAgentsQuery();

  // Fetch Hub agents using RTK Query
  const {
    data: agents = [],
    isLoading: loading,
    refetch,
  } = useGetHubAgentsQuery();

  const [refreshHubIndex, { isLoading: refreshing }] =
    useRefreshHubIndexMutation();

  const handleRefresh = async () => {
    try {
      await refreshHubIndex().unwrap();
      dispatch(
        showSuccess(
          t('hubIndexRefreshed', {
            defaultValue: 'Hub index refreshed successfully',
          })
        )
      );
    } catch (err) {
      logger.error('Error refreshing hub index:', err);
      dispatch(showError('Failed to refresh hub index'));
    }
  };

  const isInstalled = useCallback(
    (agentId: string) => {
      return installedAgents.some((agent) => agent.manifest.id === agentId);
    },
    [installedAgents]
  );

  const filterFn = useCallback(
    (agent: HubAgent, query: string) =>
      agent.name.toLowerCase().includes(query.toLowerCase()) ||
      agent.description.toLowerCase().includes(query.toLowerCase()) ||
      agent.category.toLowerCase().includes(query.toLowerCase()),
    []
  );

  const renderItem = useCallback(
    (agent: HubAgent) => {
      const installed = isInstalled(agent.id);
      return (
        <Card
          key={agent.id}
          className="flex flex-col h-full hover:bg-accent/50 transition-colors"
        >
          <CardHeader className="flex-row items-center gap-3 pb-3 space-y-0">
            {agent.icon ? (
              <img
                src={agent.icon}
                alt={agent.name}
                className="size-10 rounded-md object-cover bg-muted/20 p-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove(
                    'hidden'
                  );
                }}
              />
            ) : null}
            <div
              className={`${
                agent.icon ? 'hidden' : ''
              } rounded-lg bg-primary/10 p-2.5`}
            >
              <Bot className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate m-0 p-0">
                {agent.name}
              </CardTitle>
              <CardDescription className="text-xs mt-1 truncate">
                by {agent.author}
              </CardDescription>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary shrink-0 uppercase">
              {agent.category}
            </span>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {agent.description}
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button
              className="w-full"
              variant={installed ? 'secondary' : 'outline'}
              disabled={installed}
              onClick={() => {
                setSelectedAgent(agent);
                setInstallDialogOpen(true);
              }}
            >
              {installed ? (
                <>
                  <Check className="mr-2 size-4" />
                  {t('installed', { defaultValue: 'Installed' })}
                </>
              ) : (
                t('viewAndInstall', { defaultValue: 'View & Install' })
              )}
            </Button>
          </CardFooter>
        </Card>
      );
    },
    [isInstalled, t]
  );

  return (
    <>
      <HubCommunitySection<HubAgent>
        data={agents}
        loading={loading}
        refreshing={refreshing}
        error={null}
        onRefresh={handleRefresh}
        onRetry={refetch}
        searchPlaceholder={t('searchAgents', {
          defaultValue: 'Search agents...',
        })}
        noResultsText={t('noAgentsFound', { defaultValue: 'No agents found.' })}
        emptyIcon={Bot}
        emptyTitle={t('noAgentsFound', { defaultValue: 'No agents found.' })}
        emptyDescription={t('noHubAgentsDescription', {
          defaultValue: 'No agents found in the hub.',
        })}
        filterFn={filterFn}
        renderItem={renderItem}
      />

      <InstallAgentDialog
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        agent={selectedAgent}
        onInstalled={() => {
          onInstalled?.();
        }}
      />
    </>
  );
}
