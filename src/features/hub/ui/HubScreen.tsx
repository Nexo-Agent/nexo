import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/atoms/tabs';
import { useGetInstalledAgentsQuery } from '@/features/agent/state/api';
import { useGetMCPConnectionsQuery } from '@/features/mcp';
import { CommunityAgentsSection } from './CommunityAgentsSection';
import { CommunityMCPServersSection } from '@/features/mcp/ui/CommunityMCPServersSection';
import { CommunityPromptsSection } from './CommunityPromptsSection';
import { InstallMCPServerDialog } from './InstallMCPServerDialog';
import { InstallPromptDialog } from './InstallPromptDialog';
import type { HubMCPServer } from '@/features/mcp/types';
import type { HubPrompt } from './prompt-types';
import { Bot, Server, FileText } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import {
  useGetHubAgentsQuery,
  useGetHubPromptsQuery,
  useGetInstalledPromptsQuery,
} from '../state/api';

export function HubScreen() {
  const { t } = useTranslation('settings');
  const { enableAgents } = useAppSettings();
  const [activeTab, setActiveTab] = useState(enableAgents ? 'agent' : 'mcp');

  // Agents
  const { refetch: refetchAgents } = useGetInstalledAgentsQuery();
  const { refetch: refetchHubAgents } = useGetHubAgentsQuery();

  // MCP
  const { data: mcpConnections = [], refetch: refetchMCP } =
    useGetMCPConnectionsQuery();
  const installedServerIds = mcpConnections.map((c) => c.id);
  const [mcpInstallDialogOpen, setMcpInstallDialogOpen] = useState(false);
  const [serverToInstall, setServerToInstall] = useState<HubMCPServer | null>(
    null
  );

  // Prompts
  const { data: installedPrompts = [], refetch: refetchInstalledPrompts } =
    useGetInstalledPromptsQuery();
  const installedPromptIds = installedPrompts.map((p) => p.id);
  const [promptInstallDialogOpen, setPromptInstallDialogOpen] = useState(false);
  const [promptToInstall, setPromptToInstall] = useState<HubPrompt | null>(
    null
  );

  const { refetch: refetchHubPrompts } = useGetHubPromptsQuery();

  const handleMcpInstallClick = (server: HubMCPServer) => {
    setServerToInstall(server);
    setMcpInstallDialogOpen(true);
  };

  const handlePromptInstallClick = (prompt: HubPrompt) => {
    setPromptToInstall(prompt);
    setPromptInstallDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden p-6">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="w-full justify-start border-b rounded-none px-0 h-auto bg-transparent space-x-6">
          {enableAgents && (
            <TabsTrigger
              value="agent"
              className="rounded-none data-[state=active]:bg-transparent px-2 pb-2 h-auto focus-visible:ring-0 focus-visible:outline-none"
            >
              <Bot className="mr-2 h-4 w-4" />
              {t('hub.tabs.agents', { defaultValue: 'Agents' })}
            </TabsTrigger>
          )}
          <TabsTrigger
            value="mcp"
            className="rounded-none data-[state=active]:bg-transparent px-2 pb-2 h-auto focus-visible:ring-0 focus-visible:outline-none"
          >
            <Server className="mr-2 h-4 w-4" />
            {t('hub.tabs.mcp', { defaultValue: 'MCP Servers' })}
          </TabsTrigger>
          <TabsTrigger
            value="prompt"
            className="rounded-none data-[state=active]:bg-transparent px-2 pb-2 h-auto focus-visible:ring-0 focus-visible:outline-none"
          >
            <FileText className="mr-2 h-4 w-4" />
            {t('hub.tabs.prompts', { defaultValue: 'Prompts' })}
          </TabsTrigger>
        </TabsList>

        {enableAgents && (
          <TabsContent
            value="agent"
            className="mt-6 space-y-4 flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <CommunityAgentsSection
                onInstalled={() => {
                  refetchAgents();
                  refetchHubAgents();
                }}
              />
            </div>
          </TabsContent>
        )}

        <TabsContent
          value="mcp"
          className="mt-6 space-y-4 flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col pr-4">
            <CommunityMCPServersSection
              installedServerIds={installedServerIds}
              onInstall={handleMcpInstallClick}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="prompt"
          className="mt-6 space-y-4 flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <CommunityPromptsSection
              installedPromptIds={installedPromptIds}
              onInstall={handlePromptInstallClick}
            />
          </div>
        </TabsContent>
      </Tabs>

      <InstallMCPServerDialog
        open={mcpInstallDialogOpen}
        onOpenChange={setMcpInstallDialogOpen}
        server={serverToInstall}
        onInstalled={() => {
          refetchMCP();
        }}
      />

      <InstallPromptDialog
        open={promptInstallDialogOpen}
        onOpenChange={setPromptInstallDialogOpen}
        prompt={promptToInstall}
        onInstalled={() => {
          void refetchInstalledPrompts();
          void refetchHubPrompts();
        }}
      />
    </div>
  );
}
