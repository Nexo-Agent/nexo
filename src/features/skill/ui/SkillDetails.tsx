import * as React from 'react';
import { FormDialog } from '@/ui/molecules/FormDialog';
import { useLazyLoadSkillQuery } from '../state/skillsApi';
import { MarkdownContent } from '@/ui/organisms/markdown/MarkdownContent';
import { Badge } from '@/ui/atoms/badge';
import { Skeleton } from '@/ui/atoms/skeleton';

interface SkillDetailsProps {
  skillId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SkillDetails({ skillId, isOpen, onClose }: SkillDetailsProps) {
  const [loadSkill, { data: skill, isLoading }] = useLazyLoadSkillQuery();

  React.useEffect(() => {
    if (isOpen && skillId) {
      loadSkill(skillId);
    }
  }, [isOpen, skillId, loadSkill]);

  const title = isLoading
    ? 'Loading Skill...'
    : skill?.metadata.name || 'Skill Details';

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      maxWidth="5xl"
      scrollable
      scrollableHeightClass="h-[70vh]"
    >
      <div className="space-y-4">
        {/* Header Badges moved to body top */}
        <div className="flex flex-wrap gap-2 min-h-[28px]">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24" />
            </>
          ) : (
            skill && (
              <>
                {skill.metadata.metadata?.author && (
                  <Badge variant="secondary">
                    {skill.metadata.metadata.author}
                  </Badge>
                )}
                {skill.metadata.metadata?.version && (
                  <Badge variant="outline">
                    v{skill.metadata.metadata.version}
                  </Badge>
                )}
                {skill.metadata.license && (
                  <Badge variant="outline">{skill.metadata.license}</Badge>
                )}
              </>
            )
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-40 w-full mt-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
          </div>
        ) : skill ? (
          <div>
            <p className="text-muted-foreground mb-4">
              {skill.metadata.description}
            </p>
            <div className="prose prose-sm dark:prose-invert max-w-none px-4">
              <MarkdownContent content={skill.instructions} />
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Failed to load skill details.
          </div>
        )}
      </div>
    </FormDialog>
  );
}
