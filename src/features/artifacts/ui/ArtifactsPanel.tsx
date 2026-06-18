import { useTranslation } from 'react-i18next';
import * as opener from '@tauri-apps/plugin-opener';
import { useAppSelector } from '@/app/hooks';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { logger } from '@/lib/logger';
import {
  useDeleteArtifactMutation,
  useGetArtifactsQuery,
} from '../state/artifactsApi';
import { ArtifactItem, ArtifactsEmptyState } from './ArtifactItem';

export function ArtifactsPanel() {
  const { t } = useTranslation(['artifacts', 'common']);
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);

  const { data: artifacts = [], isLoading } = useGetArtifactsQuery(
    selectedChatId ?? '',
    { skip: !selectedChatId }
  );

  const [deleteArtifact] = useDeleteArtifactMutation();

  const handleOpen = async (path: string) => {
    try {
      await opener.openPath(path);
    } catch (error) {
      logger.error('[ArtifactsPanel] Failed to open artifact:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedChatId) return;
    if (!window.confirm(t('deleteConfirm'))) return;
    await deleteArtifact({ id, chatId: selectedChatId });
  };

  if (!selectedChatId) {
    return (
      <div className="flex h-full flex-col p-4">
        <ArtifactsEmptyState
          title={t('noChatTitle')}
          description={t('noChatDescription')}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      <div className="shrink-0">
        <h3 className="text-sm font-medium text-foreground">{t('tabLabel')}</h3>
        <p className="text-[11px] text-muted-foreground">
          {t('panelDescription')}
        </p>
      </div>

      <ScrollArea className="-mx-1 flex-1 px-1">
        <div className="flex flex-col gap-2 pb-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
              <span className="text-xs">{t('loading')}</span>
            </div>
          ) : artifacts.length > 0 ? (
            artifacts.map((artifact) => (
              <ArtifactItem
                key={artifact.id}
                artifact={artifact}
                onOpen={() => handleOpen(artifact.path)}
                onDelete={(e) => {
                  e.stopPropagation();
                  void handleDelete(artifact.id);
                }}
              />
            ))
          ) : (
            <ArtifactsEmptyState
              title={t('emptyTitle')}
              description={t('emptyDescription')}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
