import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { Switch } from '@/ui/atoms/switch';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/ui/atoms/tooltip';

interface AdvancedSettingsProps {
  streamEnabled: boolean;
  onStreamEnabledChange: (checked: boolean) => void;
  maxAgentIterations: number;
  onMaxAgentIterationsChange: (value: number) => void;
}

export function AdvancedSettings({
  streamEnabled,
  onStreamEnabledChange,
  maxAgentIterations,
  onMaxAgentIterationsChange,
}: AdvancedSettingsProps) {
  const { t } = useTranslation(['settings', 'common', 'chat']);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-1">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="stream-enabled" className="text-sm">
              {t('streamMode', { ns: 'chat' })}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground/70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                {t('streamModeDescription', { ns: 'settings' })}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            {t('streamModeDescriptionSecondary', { ns: 'settings' })}
          </p>
        </div>
        <Switch
          id="stream-enabled"
          checked={streamEnabled}
          onCheckedChange={onStreamEnabledChange}
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="max-iterations" className="text-sm">
              {t('maxIterations', { ns: 'common' })}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground/70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                {t('maxIterationsDescription', { ns: 'settings' })}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            {t('maxIterationsDescriptionSecondary', {
              ns: 'settings',
            })}
          </p>
        </div>
        <Input
          id="max-iterations"
          type="number"
          min={1}
          max={100}
          value={maxAgentIterations}
          onChange={(e) =>
            onMaxAgentIterationsChange(parseInt(e.target.value) || 1)
          }
          className="w-14 h-7 text-right text-xs bg-muted/20 border-border/50 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 no-spinner"
        />
      </div>
    </div>
  );
}
