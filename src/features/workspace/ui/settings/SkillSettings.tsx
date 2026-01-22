import { useTranslation } from 'react-i18next';
import { Label } from '@/ui/atoms/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/ui/atoms/tooltip';
import { Info } from 'lucide-react';
import { SkillSelector } from '@/features/skill/ui/SkillSelector';

interface SkillSettingsProps {
  selectedSkillIds: string[];
  onChange: (skillIds: string[]) => void;
}

export function SkillSettings({
  selectedSkillIds,
  onChange,
}: SkillSettingsProps) {
  const { t } = useTranslation(['settings', 'common']);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <Label className="text-lg font-semibold">{t('skills')}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="size-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            Skills are specialized instructions and tools that agents can use.
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-sm text-muted-foreground">
        Select the skills you want to enable for this workspace. These will be
        injected into the agent&apos;s system prompt.
      </p>
      <SkillSelector selectedSkillIds={selectedSkillIds} onChange={onChange} />
    </div>
  );
}
