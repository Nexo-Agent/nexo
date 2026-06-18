import * as React from 'react';
import { FormDialog } from '@/ui/molecules/FormDialog';
import { Button } from '@/ui/atoms/button';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { useImportSkillFromGithubMutation } from '../state/skillsApi';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ImportSkillFromGithubDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportSkillFromGithubDialog({
  isOpen,
  onClose,
}: ImportSkillFromGithubDialogProps) {
  const { t } = useTranslation(['skills', 'common']);
  const [url, setUrl] = React.useState('');
  const [importSkill, { isLoading }] = useImportSkillFromGithubMutation();

  const handleImport = async () => {
    if (!url.trim()) {
      toast.error(t('githubUrlRequired'));
      return;
    }

    try {
      await importSkill(url.trim()).unwrap();
      toast.success(t('importSkillSuccess'));
      setUrl('');
      onClose();
    } catch (error) {
      logger.error('Failed to import skill from GitHub:', error);
      toast.error(t('importSkillError'));
    }
  };

  const footer = (
    <>
      <Button variant="outline" onClick={onClose}>
        {t('common:cancel')}
      </Button>
      <Button onClick={handleImport} disabled={isLoading}>
        {isLoading ? t('importingSkill') : t('importFromGithub')}
      </Button>
    </>
  );

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={t('importFromGithub')}
      description={t('importFromGithubDescription')}
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="githubUrl">{t('githubUrl')}</Label>
          <Input
            id="githubUrl"
            placeholder={t('githubUrlPlaceholder')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t('githubUrlHint')}</p>
      </div>
    </FormDialog>
  );
}
