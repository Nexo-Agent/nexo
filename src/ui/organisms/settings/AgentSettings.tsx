import React, { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Download,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Manifest {
  id: string;
  name: string;
  description: string;
  author: string;
  schema_version: number;
}

interface InstalledAgent {
  manifest: Manifest;
  version_ref: string;
  path: string;
}

export function AgentSettings() {
  const [agents, setAgents] = useState<InstalledAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Git Install State
  const [gitUrl, setGitUrl] = useState('');
  const [gitRevision, setGitRevision] = useState('');
  const [gitSubpath, setGitSubpath] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const installed = await invoke<InstalledAgent[]>('get_installed_agents');
      setAgents(installed);
    } catch (error) {
      toast.error('Failed to fetching agents: ' + error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold mb-1">Agent Management</h3>
          <p className="text-sm text-muted-foreground">
            Extend Nexo capabilities with specialized agents.
          </p>
        </div>
        <Button
          onClick={fetchAgents}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <Tabs defaultValue="installed" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="installed">Installed Agents</TabsTrigger>
          <TabsTrigger value="store">Install New</TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-6 space-y-4">
          {agents.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <p className="text-muted-foreground text-sm">
                No agents installed yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {agents.map((agent) => (
                <Card key={agent.manifest.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {agent.manifest.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {agent.manifest.id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 h-10 overflow-hidden text-ellipsis line-clamp-2">
                      {agent.manifest.description}
                    </p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>v{agent.version_ref.substring(0, 7)}</span>
                      <span>by {agent.manifest.author}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="store" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
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
              <CardContent className="flex flex-col min-h-[200px]">
                <div className="flex-1 flex items-center justify-center py-4">
                  <div className="text-center space-y-2">
                    <Download className="h-12 w-12 mx-auto text-muted-foreground/50" />
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
                <form onSubmit={handleInstallGit} className="space-y-3">
                  <div className="space-y-2">
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
                      <div className="space-y-2">
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
                      <div className="space-y-2">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
