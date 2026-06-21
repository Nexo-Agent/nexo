import type { Artifact } from '../types';
import type { ArtifactViewer } from './types';

const viewers: ArtifactViewer[] = [];

export function registerArtifactViewer(viewer: ArtifactViewer): void {
  viewers.push(viewer);
}

export function getRegisteredArtifactViewers(): readonly ArtifactViewer[] {
  return [...viewers].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function resolveArtifactViewer(
  artifact: Artifact
): ArtifactViewer | null {
  for (const viewer of getRegisteredArtifactViewers()) {
    if (viewer.canView(artifact)) {
      return viewer;
    }
  }
  return null;
}

/** @internal Test helper */
export function resetArtifactViewersForTests(): void {
  viewers.length = 0;
}
