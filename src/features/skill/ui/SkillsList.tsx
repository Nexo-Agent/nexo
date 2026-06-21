import * as React from 'react';
import {
  useGetAllSkillsQuery,
  useDeleteSkillMutation,
} from '../state/skillsApi';
import { SkillCard } from './SkillCard';
import { SkillDetails } from './SkillDetails';
import { toast } from 'sonner';
import { FormDialog } from '@/ui/molecules/FormDialog';
import { Button } from '@/ui/atoms/button';
import { useTranslation } from 'react-i18next';

export function SkillsList() {
  const { t } = useTranslation(['skills', 'common']);
  const { data: skills, isLoading } = useGetAllSkillsQuery();
  const [deleteSkill] = useDeleteSkillMutation();
  const [selectedSkillId, setSelectedSkillId] = React.useState<string | null>(
    null
  );
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [skillToDelete, setSkillToDelete] = React.useState<string | null>(null);

  const handleDelete = (id: string) => {
    setSkillToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!skillToDelete) return;
    try {
      await deleteSkill(skillToDelete).unwrap();
      toast.success(t('deleteSkillSuccess'));
    } catch (_error) {
      toast.error(t('deleteSkillError'));
    } finally {
      setSkillToDelete(null);
    }
  };

  const handleViewDetails = (id: string) => {
    setSelectedSkillId(id);
    setIsDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t('loadingSkills')}
      </p>
    );
  }

  if (!skills?.length) {
    return (
      <div className="space-y-2 py-10 text-center text-sm text-muted-foreground">
        <p>{t('emptyStateDescription')}</p>
        <p className="text-xs">{t('emptyStateHint')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <SkillDetails
        skillId={selectedSkillId}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      <FormDialog
        open={!!skillToDelete}
        onOpenChange={(open) => !open && setSkillToDelete(null)}
        title={t('deleteSkill')}
        description={t('deleteSkillConfirmation')}
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setSkillToDelete(null)}
              className="mr-2"
            >
              {t('common:cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('common:delete')}
            </Button>
          </>
        }
      >
        <div className="text-sm text-muted-foreground">{t('cannotUndone')}</div>
      </FormDialog>
    </>
  );
}
