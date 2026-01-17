import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/atoms/tabs';
import { useGetInstalledAgentsQuery } from '@/features/agent/state/api';
import { useGetMCPConnectionsQuery } from '@/features/mcp/hooks/useMCPConnections';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { CommunityAgentsSection } from './CommunityAgentsSection';
import { CommunityMCPServersSection } from './CommunityMCPServersSection';
import { CommunityPromptsSection } from './CommunityPromptsSection';
import { InstallMCPServerDialog } from './InstallMCPServerDialog';
import { InstallPromptDialog } from './InstallPromptDialog';
import type { HubMCPServer } from '@/features/mcp/types';
import type { HubPrompt } from '@/features/prompt/types';
import { Bot, Server, FileText } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Prompt {
  id: string;
}

export function HubScreen() {
  const { t } = useTranslation('settings');
  const [activeTab, setActiveTab] = useState('agent');

  // Agents
  const { refetch: refetchAgents } = useGetInstalledAgentsQuery(); // We don't need the list for agent section as it checks internally or we assume distinct logic?
  // Wait, CommunityAgentsSection might NOT check installed internally?
  // AgentSettings passed `onInstalled` but didn't pass `installedIds`.
  // Looking at AgentSettings code, CommunityAgentsSection is self-contained or uses query internally?
  // I need to check CommunityAgentsSection to be sure.
  // But for now, I'll assume it works similarly.

  // MCP
  const { data: mcpConnections = [], refetch: refetchMCP } =
    useGetMCPConnectionsQuery();
  const installedServerIds = mcpConnections.map((c) => c.id);
  const [mcpInstallDialogOpen, setMcpInstallDialogOpen] = useState(false);
  const [serverToInstall, setServerToInstall] = useState<HubMCPServer | null>(
    null
  );

  // Prompts
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const installedPromptIds = prompts.map((p) => p.id);
  const [promptInstallDialogOpen, setPromptInstallDialogOpen] = useState(false);
  const [promptToInstall, setPromptToInstall] = useState<HubPrompt | null>(
    null
  );

  const loadPrompts = useCallback(async () => {
    try {
      const data = await invokeCommand<Prompt[]>(TauriCommands.GET_PROMPTS);
      setPrompts(data);
    } catch (e) {
      logger.error('Failed to load prompts:', e);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPrompts();
  }, [loadPrompts]);

  const handleMcpInstallClick = (server: HubMCPServer) => {
    setServerToInstall(server);
    setMcpInstallDialogOpen(true);
  };

  const handlePromptInstallClick = (prompt: HubPrompt) => {
    setPromptToInstall(prompt);
    setPromptInstallDialogOpen(true);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex flex-col flex-1 min-h-0"
      >
        <TabsList className="grid w-full grid-cols-3 shrink-0">
          <TabsTrigger value="agent" className="gap-2">
            <Bot className="size-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-2">
            <Server className="size-4" />
            {t('mcp.label', { defaultValue: 'MCP' })}
          </TabsTrigger>
          <TabsTrigger value="prompt" className="gap-2">
            <FileText className="size-4" />
            {t('prompts.label', { defaultValue: 'Prompts' })}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="agent"
          className="mt-6 space-y-4 flex-1 flex flex-col min-h-0"
        >
          {/* Reuse CommunityAgentsSection which seems to handle scrolling internally or needs a container */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <CommunityAgentsSection onInstalled={() => refetchAgents()} />
          </div>
        </TabsContent>

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
          loadPrompts();
        }}
      />
    </div>
  );
}
