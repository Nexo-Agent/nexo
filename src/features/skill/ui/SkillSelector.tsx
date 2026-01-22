import { useGetAllSkillsQuery } from '../state/skillsApi';
import { Badge } from '@/ui/atoms/badge';
import { cn } from '@/lib/utils';

interface SkillSelectorProps {
  selectedSkillIds: string[];
  onChange: (skillIds: string[]) => void;
}

export function SkillSelector({
  selectedSkillIds,
  onChange,
}: SkillSelectorProps) {
  const { data: skills, isLoading } = useGetAllSkillsQuery();

  const handleToggleSkill = (skillId: string) => {
    if (selectedSkillIds.includes(skillId)) {
      onChange(selectedSkillIds.filter((id) => id !== skillId));
    } else {
      onChange([...selectedSkillIds, skillId]);
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading skills...</div>
    );
  }

  if (!skills || skills.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No skills available. Please sync skills from the Skills Manager.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => {
        const isSelected = selectedSkillIds.includes(skill.id);
        return (
          <Badge
            key={skill.id}
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-all',
              isSelected && 'bg-primary text-primary-foreground'
            )}
            onClick={() => handleToggleSkill(skill.id)}
          >
            {skill.name}
          </Badge>
        );
      })}
    </div>
  );
}
