import * as opener from '@tauri-apps/plugin-opener';
import type { AppDispatch } from '@/app/store';
import { logger } from '@/lib/logger';
import type { Artifact } from '../types';
import { resolveArtifactViewer } from './registry';

export async function openArtifact(
  artifact: Artifact,
  dispatch: AppDispatch
): Promise<void> {
  const viewer = resolveArtifactViewer(artifact);
  if (viewer) {
    await viewer.open(artifact, { dispatch });
    return;
  }

  try {
    await opener.openPath(artifact.path);
  } catch (error) {
    logger.error(
      '[openArtifact] Failed to open artifact with system app:',
      error
    );
  }
}
