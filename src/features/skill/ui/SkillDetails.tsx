import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/ui/atoms/dialog/component';
import { useLazyLoadSkillQuery } from '../state/skillsApi';
import { MarkdownContent } from '@/ui/organisms/markdown/MarkdownContent';
import { Badge } from '@/ui/atoms/badge';
import { Skeleton } from '@/ui/atoms/skeleton';
import { ScrollArea } from '@/ui/atoms/scroll-area';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              skill?.metadata.name || 'Skill Details'
            )}
          </DialogTitle>
          {/* Reserve space for badges to prevent layout shift */}
          <div className="flex flex-wrap gap-2 mt-2 min-h-[28px]">
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
        </DialogHeader>
        <DialogBody className="flex-1 overflow-y-auto">
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
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {skill.metadata.description}
              </p>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ScrollArea>
                  <MarkdownContent content={skill.instructions} />
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Failed to load skill details.
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
