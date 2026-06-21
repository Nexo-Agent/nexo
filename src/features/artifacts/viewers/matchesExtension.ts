import type { Artifact } from '../types';

export function getArtifactExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function matchesExtension(
  artifact: Artifact,
  extensions: readonly string[]
): boolean {
  const ext = getArtifactExtension(artifact.filename);
  return extensions.includes(ext);
}
