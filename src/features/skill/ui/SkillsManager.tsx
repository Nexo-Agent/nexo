import * as React from 'react';
import { SkillsList } from './SkillsList';
import { Button } from '@/ui/atoms/button/button';
import { useSyncSkillsMutation } from '../state/skillsApi';
import { ImportSkillDialog } from './ImportSkillDialog';
import { PlusIcon, RefreshCwIcon, FolderOpenIcon } from 'lucide-react';
import { toast } from 'sonner';

export function SkillsManager() {
  const [syncSkills, { isLoading: isSyncing }] = useSyncSkillsMutation();
  const [isImportOpen, setIsImportOpen] = React.useState(false);

  const handleOpenFolder = async () => {
    try {
      const { appDataDir } = await import('@tauri-apps/api/path');
      const appData = await appDataDir();
      const skillsPath = `${appData}/skills`;

      const { openPath } = await import('@tauri-apps/plugin-opener');
      await openPath(skillsPath);
    } catch (error) {
      console.error('Failed to open skills folder:', error);
      toast.error('Failed to open skills folder');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Skills</h1>
          <p className="text-muted-foreground">
            Manage skills that can be used by your AI agents to perform
            specialized tasks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenFolder}>
            <FolderOpenIcon className="mr-2 h-4 w-4" />
            Open Folder
          </Button>
          <Button
            variant="outline"
            onClick={() => syncSkills()}
            disabled={isSyncing}
          >
            <RefreshCwIcon
              className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
            />
            Sync
          </Button>
          <Button onClick={() => setIsImportOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Import Skill
          </Button>
        </div>
      </div>

      <SkillsList />

      <ImportSkillDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </div>
  );
}
