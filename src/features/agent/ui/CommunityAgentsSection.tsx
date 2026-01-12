import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Bot, Loader2, Check } from 'lucide-react';
import { Input } from '@/ui/atoms/input';
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
import { InstallAgentDialog } from './InstallAgentDialog';
import type { HubAgent } from '../types';
import { useGetInstalledAgentsQuery } from '../state/api';

export function CommunityAgentsSection({
  onInstalled,
}: {
  onInstalled?: () => void;
}) {
  const { t } = useTranslation(['settings']);
  const [agents, setAgents] = useState<HubAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<HubAgent | null>(null);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);

  // Fetch installed agents to check status
  const { data: installedAgents = [] } = useGetInstalledAgentsQuery();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const data = await invokeCommand<HubAgent[]>(
        TauriCommands.FETCH_HUB_AGENTS
      );
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const isInstalled = (agentId: string) => {
    return installedAgents.some((agent) => agent.manifest.id === agentId);
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            {t('communityAgents', { defaultValue: 'Community Agents' })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('communityAgentsDescription', {
              defaultValue:
                'Discover and install agents created by the community.',
            })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAgents}>
          {t('refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchAgents', {
            defaultValue: 'Search agents...',
          })}
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">
            {t('noAgentsFound', { defaultValue: 'No agents found.' })}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-16">
          {filteredAgents.map((agent) => {
            const installed = isInstalled(agent.id);
            return (
              <Card key={agent.id} className="flex flex-col h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {agent.icon ? (
                        <img
                          src={agent.icon}
                          alt={agent.name}
                          className="w-10 h-10 object-contain rounded-md bg-muted/20 p-1"
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
                    </div>
                  </div>
                  <CardTitle className="mt-3 text-base">{agent.name}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-2">
                    <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {agent.category}
                    </span>
                    <span>by {agent.author}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
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
          })}
        </div>
      )}

      <InstallAgentDialog
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        agent={selectedAgent}
        onInstalled={() => {
          // No need to manually refresh, RTK Query tags handle it
          onInstalled?.();
        }}
      />
    </div>
  );
}
