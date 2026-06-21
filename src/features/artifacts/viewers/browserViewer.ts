import { absolutePathToFileUrl } from '@/features/browser/lib/fileUrl';
import { openArtifactViewerInRightPanel } from '@/features/ui/state/uiSlice';
import { registerArtifactViewer } from './registry';
import { matchesExtension } from './matchesExtension';
import { ARTIFACT_VIEWER_IDS, type ArtifactViewer } from './types';

export const BROWSER_ARTIFACT_EXTENSIONS = ['html', 'htm', 'pdf'] as const;

export const browserArtifactViewer: ArtifactViewer = {
  id: ARTIFACT_VIEWER_IDS.browser,
  canView: (artifact) =>
    matchesExtension(artifact, BROWSER_ARTIFACT_EXTENSIONS),
  open: async (artifact, { dispatch }) => {
    const url = await absolutePathToFileUrl(artifact.path);
    dispatch(
      openArtifactViewerInRightPanel({
        viewerId: ARTIFACT_VIEWER_IDS.browser,
        artifactId: artifact.id,
        chatId: artifact.chat_id,
        payload: { url },
      })
    );
  },
};

registerArtifactViewer(browserArtifactViewer);
