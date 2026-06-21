import './browserViewer';
import './markdownViewer';

export { openArtifact } from './openArtifact';
export {
  getRegisteredArtifactViewers,
  resolveArtifactViewer,
  resetArtifactViewersForTests,
} from './registry';
export {
  ARTIFACT_VIEWER_IDS,
  type ArtifactViewer,
  type ArtifactViewerPanelState,
} from './types';
export {
  BROWSER_ARTIFACT_EXTENSIONS,
  browserArtifactViewer,
} from './browserViewer';
export {
  MARKDOWN_ARTIFACT_EXTENSIONS,
  markdownArtifactViewer,
} from './markdownViewer';
