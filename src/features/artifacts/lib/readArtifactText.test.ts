import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readArtifactTextFile } from './readArtifactText';

const readFile = vi.fn();

vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: (...args: unknown[]) => readFile(...args),
}));

describe('readArtifactTextFile', () => {
  beforeEach(() => {
    readFile.mockReset();
  });

  it('reads bytes and decodes as utf-8 text', async () => {
    readFile.mockResolvedValue(new TextEncoder().encode('# Hello'));

    await expect(
      readArtifactTextFile('/tmp/artifacts/chat/a.md')
    ).resolves.toBe('# Hello');

    expect(readFile).toHaveBeenCalledWith('/tmp/artifacts/chat/a.md');
  });

  it('trims whitespace from the path before reading', async () => {
    readFile.mockResolvedValue(new TextEncoder().encode('ok'));

    await readArtifactTextFile('  /tmp/a.md  ');

    expect(readFile).toHaveBeenCalledWith('/tmp/a.md');
  });
});
