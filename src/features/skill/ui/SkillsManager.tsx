import * as React from 'react';
import { SkillsList } from './SkillsList';
import { Button } from '@/ui/atoms/button/button';
import { ImportSkillFromGithubDialog } from './ImportSkillFromGithubDialog';
import { useOpenSkillsFolderMutation } from '../state/skillsApi';
import { useSkillsChangedListener } from '../hooks/useSkillsChangedListener';
import { PlusIcon, FolderOpenIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function SkillsManager() {
  const { t } = useTranslation('skills');
  const [openSkillsFolder, { isLoading: isOpening }] =
    useOpenSkillsFolderMutation();
  const [isImportOpen, setIsImportOpen] = React.useState(false);

  useSkillsChangedListener();

  const handleOpenFolder = async () => {
    try {
      await openSkillsFolder().unwrap();
    } catch (error) {
      console.error('Failed to open skills folder:', error);
      toast.error(t('openFolderError'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={handleOpenFolder}
          size="sm"
          disabled={isOpening}
        >
          <FolderOpenIcon className="mr-2 h-4 w-4" />
          {t('openSkillsFolder')}
        </Button>
        <Button onClick={() => setIsImportOpen(true)} size="sm">
          <PlusIcon className="mr-2 h-4 w-4" />
          {t('importFromGithub')}
        </Button>
      </div>

      <SkillsList />

      <ImportSkillFromGithubDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </div>
  );
}
