import { useTranslation } from 'react-i18next';
import * as opener from '@tauri-apps/plugin-opener';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { openBrowserInRightPanel } from '@/features/ui/state/uiSlice';
import {
  absolutePathToFileUrl,
  isBrowserPreviewableFilename,
} from '@/features/browser/lib/fileUrl';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { logger } from '@/lib/logger';
import {
  useDeleteArtifactMutation,
  useGetArtifactsQuery,
} from '../state/artifactsApi';
import type { Artifact } from '../types';
import { ArtifactItem, ArtifactsEmptyState } from './ArtifactItem';

export function ArtifactsPanel() {
  const { t } = useTranslation(['artifacts', 'common']);
  const dispatch = useAppDispatch();
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);

  const { data: artifacts = [], isLoading } = useGetArtifactsQuery(
    selectedChatId ?? '',
    { skip: !selectedChatId }
  );

  const [deleteArtifact] = useDeleteArtifactMutation();

  const handleOpen = async (artifact: Artifact) => {
    if (isBrowserPreviewableFilename(artifact.filename)) {
      dispatch(
        openBrowserInRightPanel({
          url: absolutePathToFileUrl(artifact.path),
        })
      );
      return;
    }
    try {
      await opener.openPath(artifact.path);
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
                onOpen={() => handleOpen(artifact)}
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
