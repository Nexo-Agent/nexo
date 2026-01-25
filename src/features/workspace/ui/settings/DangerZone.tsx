import { Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Label } from '@/ui/atoms/label';

interface DangerZoneProps {
  hasChats: boolean;
  isClearingChats: boolean;
  onClearAllChats: () => void;
  isDeleting: boolean;
  onDelete: () => void;
}

export function DangerZone({
  hasChats,
  isClearingChats,
  onClearAllChats,
  isDeleting,
  onDelete,
}: DangerZoneProps) {
  const { t } = useTranslation(['settings']);

  return (
    <div className="space-y-4 pt-4">
      <div className="relative flex items-center gap-2.5 px-0.5">
        <div className="h-5 w-[3px] bg-destructive rounded-full" />
        <h3 className="text-base font-semibold text-foreground">
          {t('dangerZone', { ns: 'settings' })}
        </h3>
      </div>

      <div className="rounded-xl border border-destructive/20 bg-destructive/5 overflow-hidden">
        {/* Clear All Chats */}
        <div className="flex items-center justify-between p-4 hover:bg-destructive/10 transition-colors">
          <div className="flex flex-col gap-1 max-w-[70%]">
            <Label className="text-sm font-medium text-foreground">
              {t('clearAllChats', { ns: 'settings' })}
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('clearAllChatsDescription', { ns: 'settings' })}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearAllChats}
            disabled={!hasChats || isClearingChats}
            className="border-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-[background-color,color,border-color] shrink-0"
          >
            {isClearingChats ? (
              <Loader2 className="size-3.5 animate-spin mr-2" />
            ) : (
              <Trash2 className="size-3.5 mr-2" />
            )}
            {t('clearAllChats', { ns: 'settings' })}
          </Button>
        </div>

        <div className="h-px bg-destructive/10 mx-4" />

        {/* Delete Workspace */}
        <div className="flex items-center justify-between p-4 hover:bg-destructive/10 transition-colors">
          <div className="flex flex-col gap-1 max-w-[70%]">
            <Label className="text-sm font-medium text-foreground">
              {t('deleteWorkspace', { ns: 'settings' })}
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('deleteWorkspaceDescription', { ns: 'settings' })}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 shadow-sm transition-[background-color,box-shadow] shrink-0"
          >
            {isDeleting ? (
              <Loader2 className="size-3.5 animate-spin mr-2" />
            ) : (
              <Trash2 className="size-3.5 mr-2" />
            )}
            {t('deleteWorkspace', { ns: 'settings' })}
          </Button>
        </div>
      </div>
    </div>
  );
}
