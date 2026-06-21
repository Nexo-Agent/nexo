import * as React from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { SkillsList } from './SkillsList';
import { Button } from '@/ui/atoms/button/button';
import { ImportSkillFromGithubDialog } from './ImportSkillFromGithubDialog';
import { useOpenSkillsFolderMutation } from '../state/skillsApi';
import { useSkillsChangedListener } from '../hooks/useSkillsChangedListener';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { DOCS_URL } from '@/features/settings/lib/constants';
import { logger } from '@/lib/logger';

export function SkillsManager() {
  const { t } = useTranslation(['skills', 'settings']);
  const [openSkillsFolder, { isLoading: isOpening }] =
    useOpenSkillsFolderMutation();
  const [isImportOpen, setIsImportOpen] = React.useState(false);

  useSkillsChangedListener();

  const openDocs = async () => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(DOCS_URL);
    } catch (error) {
      logger.error('Failed to open skills docs link:', error);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await openSkillsFolder().unwrap();
    } catch (error) {
      logger.error('Failed to open skills folder:', error);
      toast.error(t('openFolderError'));
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <p className="-mt-1 text-sm leading-relaxed text-muted-foreground">
        {t('skillsPageDescription')}{' '}
        <button
          type="button"
          onClick={() => void openDocs()}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t('learnMore', { ns: 'settings' })}
        </button>
      </p>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">{t('skillsSection')}</h2>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenFolder}
            disabled={isOpening}
          >
            <FolderOpen className="size-4" />
            {t('openSkillsFolder')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsImportOpen(true)}
          >
            <Plus className="size-4" />
            {t('importFromGithub')}
          </Button>
        </div>
      </div>

      <SkillsList />

      <ImportSkillFromGithubDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </div>
  );
}
