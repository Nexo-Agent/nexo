import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/atoms/card';
import { Badge } from '@/ui/atoms/badge';
import { Button } from '@/ui/atoms/button/button';
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

  return (
    <Card className={isSelected ? 'border-primary' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{skill.name}</CardTitle>
            <CardDescription className="mt-2">
              {skill.description}
            </CardDescription>
          </div>
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(skill.id)}
              className="mt-1"
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {metadata.author && (
            <Badge variant="secondary">{metadata.author}</Badge>
          )}
          {metadata.version && (
            <Badge variant="outline">v{metadata.version}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(skill.id)}
          >
            View Details
          </Button>
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(skill.id)}
            >
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
