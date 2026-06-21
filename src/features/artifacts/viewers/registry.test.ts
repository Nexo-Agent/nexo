import { describe, expect, it } from 'vitest';
import type { Artifact } from '../types';
import { browserArtifactViewer } from './browserViewer';
import { markdownArtifactViewer } from './markdownViewer';
import {
  getRegisteredArtifactViewers,
  resetArtifactViewersForTests,
  resolveArtifactViewer,
  registerArtifactViewer,
} from './registry';

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

describe('artifact viewer registry', () => {
  it('resolves browser viewer for html and pdf artifacts', () => {
    expect(resolveArtifactViewer(makeArtifact('page.html'))?.id).toBe(
      'browser'
    );
    expect(resolveArtifactViewer(makeArtifact('page.htm'))?.id).toBe('browser');
    expect(resolveArtifactViewer(makeArtifact('doc.pdf'))?.id).toBe('browser');
  });

  it('resolves markdown viewer for md artifacts', () => {
    expect(resolveArtifactViewer(makeArtifact('notes.md'))?.id).toBe(
      'markdown'
    );
  });

  it('returns null for unsupported extensions', () => {
    expect(resolveArtifactViewer(makeArtifact('script.py'))).toBeNull();
    expect(resolveArtifactViewer(makeArtifact('data.json'))).toBeNull();
  });

  it('prefers higher priority viewers', () => {
    resetArtifactViewersForTests();
    registerArtifactViewer({
      id: 'low',
      priority: 0,
      canView: (artifact) => artifact.filename.endsWith('.md'),
      open: async () => undefined,
    });
    registerArtifactViewer({
      id: 'high',
      priority: 10,
      canView: (artifact) => artifact.filename.endsWith('.md'),
      open: async () => undefined,
    });

    expect(resolveArtifactViewer(makeArtifact('notes.md'))?.id).toBe('high');

    resetArtifactViewersForTests();
    registerArtifactViewer(browserArtifactViewer);
    registerArtifactViewer(markdownArtifactViewer);
  });

  it('lists registered viewers sorted by priority', () => {
    const ids = getRegisteredArtifactViewers().map((viewer) => viewer.id);
    expect(ids).toContain('browser');
    expect(ids).toContain('markdown');
  });
});
