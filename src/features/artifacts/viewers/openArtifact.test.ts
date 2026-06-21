import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Artifact } from '../types';
import { openArtifact } from './openArtifact';
import { resolveArtifactViewer } from './registry';

const openPath = vi.fn();
const dispatch = vi.fn();

vi.mock('@tauri-apps/plugin-opener', () => ({
  openPath: (...args: unknown[]) => openPath(...args),
}));

vi.mock('./registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./registry')>();
  return {
    ...actual,
    resolveArtifactViewer: vi.fn(),
  };
});

function makeArtifact(filename: string): Artifact {
  return {
    id: 'artifact-1',
    chat_id: 'chat-1',
    message_id: null,
    tool_call_id: null,
    title: 'Test artifact',
    filename,
    path: `/tmp/${filename}`,
    mime_type: null,
    size_bytes: 100,
    created_at: Date.now(),
  };
}

describe('openArtifact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to a resolved viewer', async () => {
    const open = vi.fn(async () => undefined);
    vi.mocked(resolveArtifactViewer).mockReturnValue({
      id: 'markdown',
      canView: () => true,
      open,
    });

    const artifact = makeArtifact('notes.md');
    await openArtifact(artifact, dispatch);

    expect(open).toHaveBeenCalledWith(artifact, { dispatch });
    expect(openPath).not.toHaveBeenCalled();
  });

  it('falls back to the system opener when no viewer matches', async () => {
    vi.mocked(resolveArtifactViewer).mockReturnValue(null);
    openPath.mockResolvedValue(undefined);

    const artifact = makeArtifact('script.py');
    await openArtifact(artifact, dispatch);

    expect(openPath).toHaveBeenCalledWith('/tmp/script.py');
  });
});
