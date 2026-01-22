import * as React from 'react';
import {
  useGetAllSkillsQuery,
  useDeleteSkillMutation,
} from '../state/skillsApi';
import { SkillCard } from './SkillCard';
import { SkillDetails } from './SkillDetails';
import { toast } from 'sonner';

export function SkillsList() {
  const { data: skills, isLoading } = useGetAllSkillsQuery();
  const [deleteSkill] = useDeleteSkillMutation();
  const [selectedSkillId, setSelectedSkillId] = React.useState<string | null>(
    null
  );
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const handleDelete = async (id: string) => {
    if (
      confirm(
        'Are you sure you want to delete this skill? This will remove it from the filesystem.'
      )
    ) {
      try {
        await deleteSkill(id).unwrap();
        toast.success('Skill deleted successfully');
      } catch (_error) {
        toast.error('Failed to delete skill');
      }
    }
  };

  const handleViewDetails = (id: string) => {
    setSelectedSkillId(id);
    setIsDetailsOpen(true);
  };

  if (isLoading) {
    return <div>Loading skills...</div>;
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
          No skills found. Import a skill directory to get started.
        </div>
      )}

      <SkillDetails
        skillId={selectedSkillId}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
}
