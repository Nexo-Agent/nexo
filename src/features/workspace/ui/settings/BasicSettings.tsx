import { useRef } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/ui/atoms/tooltip';
import { cn } from '@/lib/utils';

interface BasicSettingsProps {
  name: string;
  onNameChange: (name: string) => void;
  systemMessage: string;
  onSystemMessageChange: (value: string) => void;
}

export function BasicSettings({
  name,
  onNameChange,
  systemMessage,
  onSystemMessageChange,
}: BasicSettingsProps) {
  const { t } = useTranslation(['settings', 'common']);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-4">
      <div className="space-y-2 w-full">
        <Label htmlFor="workspace-name">{t('workspaceName')}</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('enterWorkspaceName')}
          className="w-full"
          required
        />
      </div>
      <div className="space-y-2 w-full">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="system-message">{t('systemMessage')}</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>{t('systemMessageDescription')}</TooltipContent>
          </Tooltip>
        </div>
        <textarea
          ref={textareaRef}
          data-slot="textarea"
          id="system-message"
          value={systemMessage}
          onChange={(e) => onSystemMessageChange(e.target.value)}
          placeholder={t('enterSystemMessage')}
          className={cn(
            'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:opacity-50 md:text-sm',
            'w-full min-h-32'
          )}
          rows={12}
        />
      </div>
    </div>
  );
}
