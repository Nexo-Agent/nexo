import type { AppDispatch } from '@/app/store';
import type { Artifact } from '../types';

export interface ArtifactViewerContext {
  dispatch: AppDispatch;
}

export interface ArtifactViewerPanelState {
  viewerId: string;
  artifactId: string;
  chatId: string;
  payload?: { url?: string };
}

export interface ArtifactViewer {
  /** Stable id, e.g. 'browser' | 'markdown' */
  id: string;
  /** Higher wins when multiple viewers match (default 0) */
  priority?: number;
  canView(artifact: Artifact): boolean;
  open(artifact: Artifact, ctx: ArtifactViewerContext): Promise<void>;
}

export const ARTIFACT_VIEWER_IDS = {
  browser: 'browser',
  markdown: 'markdown',
} as const;
