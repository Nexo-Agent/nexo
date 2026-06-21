import { openArtifactViewerInRightPanel } from '@/features/ui/state/uiSlice';
import { registerArtifactViewer } from './registry';
import { matchesExtension } from './matchesExtension';
import { ARTIFACT_VIEWER_IDS, type ArtifactViewer } from './types';

export const MARKDOWN_ARTIFACT_EXTENSIONS = ['md'] as const;

export const markdownArtifactViewer: ArtifactViewer = {
  id: ARTIFACT_VIEWER_IDS.markdown,
  canView: (artifact) =>
    matchesExtension(artifact, MARKDOWN_ARTIFACT_EXTENSIONS),
  open: async (artifact, { dispatch }) => {
    dispatch(
      openArtifactViewerInRightPanel({
        viewerId: ARTIFACT_VIEWER_IDS.markdown,
        artifactId: artifact.id,
        chatId: artifact.chat_id,
      })
    );
  },
};

registerArtifactViewer(markdownArtifactViewer);
