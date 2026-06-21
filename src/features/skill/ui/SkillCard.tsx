import { memo, useMemo } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import type { SkillRecord } from '../types';
import { cn } from '@/lib/utils';

interface SkillCardProps {
  skill: SkillRecord;
  onViewDetails?: (skillId: string) => void;
  onDelete?: (skillId: string) => void;
}

function parseSkillMetadata(metadataJson?: string) {
  if (!metadataJson) return {} as Record<string, string | undefined>;

  try {
    const parsed = JSON.parse(metadataJson) as {
      author?: string;
      version?: string;
      metadata?: { author?: string; version?: string };
    };

    return {
      author: parsed.metadata?.author ?? parsed.author,
      version: parsed.metadata?.version ?? parsed.version,
    };
  } catch {
    return {};
  }
}

export const SkillCard = memo(function SkillCard({
  skill,
  onViewDetails,
  onDelete,
}: SkillCardProps) {
  const { t } = useTranslation(['skills', 'settings']);
  const metadata = useMemo(
    () => parseSkillMetadata(skill.metadataJson),
    [skill.metadataJson]
  );

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium">{skill.name}</p>
        {skill.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {skill.description}
          </p>
        ) : null}
        {metadata.author || metadata.version ? (
          <p className="truncate text-xs text-muted-foreground">
            {[metadata.author, metadata.version ? `v${metadata.version}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onViewDetails ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => onViewDetails(skill.id)}
            aria-label={t('viewSkillDetails')}
          >
            <Settings className="size-4" />
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'size-8 text-muted-foreground hover:text-destructive'
            )}
            onClick={() => onDelete(skill.id)}
            aria-label={t('deleteSkill')}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
});
