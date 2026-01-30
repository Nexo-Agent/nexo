import { EntityCard } from '@/ui/molecules/EntityCard';
import { Badge } from '@/ui/atoms/badge';
import { Button } from '@/ui/atoms/button';
import { Zap, Trash2 } from 'lucide-react';
import type { SkillRecord } from '../types';

interface SkillCardProps {
  skill: SkillRecord;
  isSelected?: boolean;
  onSelect?: (skillId: string) => void;
  onViewDetails?: (skillId: string) => void;
  onDelete?: (skillId: string) => void;
}

export function SkillCard({
  skill,
  isSelected,
  onSelect,
  onViewDetails,
  onDelete,
}: SkillCardProps) {
  const metadata = skill.metadataJson ? JSON.parse(skill.metadataJson) : {};

  const badges = (
    <div className="flex flex-wrap gap-2">
      {metadata.author && <Badge variant="secondary">{metadata.author}</Badge>}
      {metadata.version && <Badge variant="outline">v{metadata.version}</Badge>}
    </div>
  );

  const actions = (
    <div className="flex items-center gap-1">
      {onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(skill.id);
          }}
          className="mr-2 cursor-pointer"
        />
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(skill.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <EntityCard
      title={skill.name}
      description={skill.description}
      icon={<Zap className="size-5" />}
      extra={badges}
      actions={actions}
      onClick={() => onViewDetails?.(skill.id)}
      active={isSelected}
      className={isSelected ? 'border-primary ring-1 ring-primary' : ''}
    />
  );
}
