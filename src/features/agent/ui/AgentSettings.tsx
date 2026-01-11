import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/ui/atoms/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/atoms/card';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/atoms/tabs';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { Separator } from '@/ui/atoms/separator';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Download,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Bot,
  ExternalLink,
  Trash2,
  Wrench,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { TauriCommands } from '@/bindings/commands';
import { invokeCommand } from '@/lib/tauri';
import { useGetInstalledAgentsQuery } from '../state/api';
import type { InstalledAgent } from '../types';
import { CommunityAgentsSection } from './CommunityAgentsSection';

export function AgentSettings() {
  const {
    data: agents = [],
    isLoading: _loading,
    refetch: fetchAgents,
  } = useGetInstalledAgentsQuery();
  const [installing, setInstalling] = useState(false);

  // Git Install State
  const [gitUrl, setGitUrl] = useState('');
  const [gitRevision, setGitRevision] = useState('');
  const [gitSubpath, setGitSubpath] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Agent Detail Dialog State
  const [selectedAgent, setSelectedAgent] = useState<InstalledAgent | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [agentTools, setAgentTools] = useState<
    Array<{ name: string; description?: string }>
  >([]);
  const [agentInstructions, setAgentInstructions] = useState<string>('');
  const [loadingAgentInfo, setLoadingAgentInfo] = useState(false);

  const handleInstallLocal = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Agent Package',
            extensions: ['zip'],
          },
        ],
      });

      if (!selected) return;

      setInstalling(true);
      toast.info('Installing agent from zip...');

      await invoke('install_agent', {
        payload: {
          source_type: 'local',
          path: selected,
        },
      });

      toast.success('Agent installed successfully!');
      fetchAgents();
    } catch (error) {
      toast.error('Failed to install agent: ' + error);
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallGit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitUrl) return;

    setInstalling(true);
    toast.info('Cloning and installing agent...');

    try {
      await invoke('install_agent', {
        payload: {
          source_type: 'git',
          url: gitUrl,
          revision: gitRevision.trim() || 'main',
          sub_path: gitSubpath.trim() || '/',
        },
      });

      toast.success('Agent installed successfully from Git!');
      setGitUrl('');
      setGitRevision('');
      setGitSubpath('');
      setShowAdvanced(false);
      fetchAgents();
    } catch (error) {
      toast.error('Installation failed: ' + error);
    } finally {
      setInstalling(false);
    }
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent) return;

    setUpdating(true);
    toast.info(`Updating agent ${selectedAgent.manifest.name}...`);

    try {
      await invoke(TauriCommands.UPDATE_AGENT, {
        agentId: selectedAgent.manifest.id,
      });

      toast.success('Agent updated successfully!');
      // Refresh list and keep dialog open but refresh details maybe?
      // Actually fetchAgents will update the list state.
      // We might want to re-select the agent to show new version ref.
      await fetchAgents();

      // Close dialog for now as simpler UX, or find the updated agent in new list
      setDialogOpen(false);
      setSelectedAgent(null);
    } catch (error) {
      toast.error('Failed to update agent: ' + error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;

    setDeleting(true);
    try {
      await invoke(TauriCommands.DELETE_AGENT, {
        agentId: selectedAgent.manifest.id,
      });

      toast.success('Agent deleted successfully!');
      setDeleteDialogOpen(false);
      setDialogOpen(false);
      setSelectedAgent(null);
      fetchAgents();
    } catch (error) {
      toast.error('Failed to delete agent: ' + error);
    } finally {
      setDeleting(false);
    }
  };

  const fetchAgentInfo = async (agentId: string) => {
    setLoadingAgentInfo(true);
    try {
      const info = await invokeCommand<{
        tools: Array<{ name: string; description?: string }>;
        instructions: string;
      }>(TauriCommands.GET_AGENT_INFO, { agentId });

      setAgentTools(info.tools || []);
      setAgentInstructions(info.instructions || '');
    } catch (error) {
      console.error('Failed to fetch agent info:', error);
      setAgentTools([]);
      setAgentInstructions('');
    } finally {
      setLoadingAgentInfo(false);
    }
  };

  const handleAgentClick = (agent: InstalledAgent) => {
    setSelectedAgent(agent);
    setDialogOpen(true);
    fetchAgentInfo(agent.manifest.id);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="installed" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="installed">Installed Agents</TabsTrigger>
          <TabsTrigger value="store">Install New</TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-4 space-y-3">
          {agents.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <p className="text-muted-foreground text-sm">
                No agents installed yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {agents.map((agent) => (
                <Card
                  key={agent.manifest.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleAgentClick(agent)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                        <Bot className="size-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">
                          {agent.manifest.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono mt-0.5">
                          {agent.manifest.id}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 h-10 overflow-hidden text-ellipsis line-clamp-2">
                      {agent.manifest.description}
                    </p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="inline-flex items-center bg-muted px-2 py-0.5 rounded font-mono">
                        v{agent.version_ref.substring(0, 7)}
                      </span>
                      <span className="text-muted-foreground">
                        by {agent.manifest.author}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="store" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Local Install */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="h-4 w-4" /> Local Installation
                </CardTitle>
                <CardDescription className="text-xs">
                  Install an agent from a .zip file on your computer.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col min-h-[180px]">
                <div className="flex-1 flex items-center justify-center py-3">
                  <div className="text-center">
                    <Download className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  </div>
                </div>
                <Button
                  onClick={handleInstallLocal}
                  disabled={installing}
                  className="w-full"
                  size="sm"
                >
                  {installing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Select Zip File
                </Button>
              </CardContent>
            </Card>

            {/* Git Install */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="h-4 w-4" /> Install from Git
                </CardTitle>
                <CardDescription className="text-xs">
                  Clone and install directly from a repository. Defaults to main
                  branch and root path.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInstallGit} className="space-y-2.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="git-url" className="text-xs">
                      Repository URL
                    </Label>
                    <Input
                      id="git-url"
                      placeholder="https://github.com/user/repo"
                      value={gitUrl}
                      onChange={(e) => setGitUrl(e.target.value)}
                      required
                      className="h-8 text-sm"
                    />
                  </div>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      showAdvanced
                        ? 'max-h-48 opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="space-y-2 pt-2 border-t">
                      <div className="space-y-1.5">
                        <Label htmlFor="git-rev" className="text-xs">
                          Revision
                        </Label>
                        <Input
                          id="git-rev"
                          placeholder="main"
                          value={gitRevision}
                          onChange={(e) => setGitRevision(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="git-sub" className="text-xs">
                          Subpath
                        </Label>
                        <Input
                          id="git-sub"
                          placeholder="/"
                          value={gitSubpath}
                          onChange={(e) => setGitSubpath(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs h-7 px-2 w-full justify-start"
                  >
                    {showAdvanced ? (
                      <>
                        <ChevronUp className="mr-1 h-3 w-3" />
                        Hide advanced options
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-3 w-3" />
                        Show advanced options
                      </>
                    )}
                  </Button>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={installing || !gitUrl}
                    size="sm"
                  >
                    {installing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="mr-2 h-4 w-4" />
                    )}
                    Clone & Install
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <CommunityAgentsSection />
        </TabsContent>
      </Tabs>

      {/* Agent Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedAgent?.manifest.name || 'Agent Details'}
            </DialogTitle>
            {selectedAgent && (
              <p className="text-sm text-muted-foreground">
                {selectedAgent.manifest.description}
              </p>
            )}
          </DialogHeader>
          <DialogBody className="overflow-hidden">
            <ScrollArea className="h-full">
              {selectedAgent && (
                <div className="space-y-3 pr-4">
                  {/* Agent ID */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Agent ID</Label>
                    <p className="text-sm font-mono bg-muted px-2.5 py-1.5 rounded">
                      {selectedAgent.manifest.id}
                    </p>
                  </div>

                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Author</Label>
                      <p className="text-sm bg-muted px-2.5 py-1.5 rounded">
                        {selectedAgent.manifest.author}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Version</Label>
                      <p className="text-sm font-mono bg-muted px-2.5 py-1.5 rounded">
                        {selectedAgent.version_ref.substring(0, 12)}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Schema</Label>
                      <p className="text-sm bg-muted px-2.5 py-1.5 rounded">
                        {selectedAgent.manifest.schema_version}
                      </p>
                    </div>
                    {selectedAgent.manifest.license && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">License</Label>
                        <p className="text-sm bg-muted px-2.5 py-1.5 rounded">
                          {selectedAgent.manifest.license}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Source & Updated Grid */}
                  {selectedAgent.install_info && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Source</Label>
                        <p className="text-sm font-mono bg-muted px-2.5 py-1.5 rounded capitalize">
                          {selectedAgent.install_info.source.type}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Updated</Label>
                        <p className="text-sm bg-muted px-2.5 py-1.5 rounded">
                          {new Date(
                            selectedAgent.install_info.updated_at * 1000
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  {(selectedAgent.manifest.homepage ||
                    selectedAgent.manifest.repository ||
                    (selectedAgent.install_info?.source.type === 'git' &&
                      selectedAgent.install_info.source.url)) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Links</Label>
                      <div className="flex flex-wrap gap-2 bg-muted px-2.5 py-1.5 rounded">
                        {selectedAgent.manifest.homepage && (
                          <a
                            href={selectedAgent.manifest.homepage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Homepage
                          </a>
                        )}
                        {selectedAgent.manifest.repository && (
                          <a
                            href={selectedAgent.manifest.repository}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Repository
                          </a>
                        )}
                        {selectedAgent.install_info?.source.type === 'git' &&
                          selectedAgent.install_info.source.url &&
                          selectedAgent.install_info.source.url !==
                            selectedAgent.manifest.repository && (
                            <a
                              href={selectedAgent.install_info.source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                            >
                              <GitBranch className="h-3 w-3" />
                              Source
                            </a>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Permissions */}
                  {selectedAgent.manifest.permissions &&
                    selectedAgent.manifest.permissions.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Permissions (
                          {selectedAgent.manifest.permissions.length})
                        </Label>
                        <div className="bg-muted px-2.5 py-1.5 rounded">
                          <div className="flex flex-wrap gap-1.5">
                            {selectedAgent.manifest.permissions.map(
                              (permission, index) => (
                                <span
                                  key={index}
                                  className="px-1.5 py-0.5 text-xs bg-background rounded"
                                >
                                  {permission}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Tools */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5" />
                      Tools ({agentTools.length})
                    </Label>
                    {loadingAgentInfo ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-2.5 py-1.5 rounded">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-xs">Loading...</span>
                      </div>
                    ) : agentTools.length > 0 ? (
                      <div className="bg-muted px-2.5 py-1.5 rounded space-y-1.5">
                        {agentTools.map((tool, index) => (
                          <div
                            key={index}
                            className="p-2 rounded bg-background border"
                          >
                            <div className="font-medium text-xs mb-0.5">
                              {tool.name}
                            </div>
                            {tool.description && (
                              <p className="text-xs text-muted-foreground leading-snug">
                                {tool.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded">
                        No tools available
                      </p>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Instructions
                    </Label>
                    {loadingAgentInfo ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-2.5 py-1.5 rounded">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-xs">Loading...</span>
                      </div>
                    ) : agentInstructions ? (
                      <pre className="text-xs font-mono bg-muted p-2.5 rounded overflow-auto max-h-[200px] whitespace-pre-wrap leading-relaxed">
                        {agentInstructions}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded">
                        No instructions available
                      </p>
                    )}
                  </div>

                  {/* Installation Path */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Installation Path</Label>
                    <p className="text-xs font-mono bg-muted px-2.5 py-1.5 rounded break-all leading-relaxed">
                      {selectedAgent.path}
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogBody>
          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>

            {selectedAgent?.install_info?.source.type === 'git' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleUpdateAgent}
                disabled={updating}
                className="gap-2"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Update
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{' '}
              {selectedAgent && (
                <span className="font-semibold">
                  {selectedAgent.manifest.name}
                </span>
              )}
              ? This action cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAgent}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
