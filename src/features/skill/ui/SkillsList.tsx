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
    return <div>{t('loadingSkills')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills?.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {skills?.length === 0 && (
        <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
          {t('noSkillsFound')}
        </div>
      )}

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
    </div>
  );
}
