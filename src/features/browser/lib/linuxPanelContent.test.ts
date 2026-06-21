import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  filePathFromFileUrl,
  resolveLinuxPanelIframeContent,
} from './linuxPanelContent';

const readArtifactTextFileMock = vi.fn();

vi.mock('@/features/artifacts/lib/readArtifactText', () => ({
  readArtifactTextFile: (...args: unknown[]) =>
    readArtifactTextFileMock(...args),
}));

vi.mock('@/features/chat/lib/html-preview', () => ({
  buildSandboxSrcdoc: (html: string) => `<sandbox>${html}</sandbox>`,
}));

vi.mock('./panelIframeSrc', () => ({
  toPanelIframeSrc: (url: string) => url,
  withIframeReloadNonce: (src: string, nonce: number) =>
    nonce > 0 ? `${src}?_nexo=${nonce}` : src,
}));

describe('filePathFromFileUrl', () => {
  it('extracts unix paths from file URLs', () => {
    expect(filePathFromFileUrl('file:///home/me/chart.html')).toBe(
      '/home/me/chart.html'
    );
  });
});

describe('resolveLinuxPanelIframeContent', () => {
  beforeEach(() => {
    readArtifactTextFileMock.mockReset();
  });

  it('loads local HTML artifacts as sandboxed srcdoc', async () => {
    readArtifactTextFileMock.mockResolvedValue(
      '<html><body>Hello</body></html>'
    );

    await expect(
      resolveLinuxPanelIframeContent('file:///home/me/chart.html')
    ).resolves.toEqual({
      kind: 'srcdoc',
      value: '<sandbox><html><body>Hello</body></html></sandbox>',
    });

    expect(readArtifactTextFileMock).toHaveBeenCalledWith(
      '/home/me/chart.html'
    );
  });

  it('uses iframe src for remote http(s) URLs', async () => {
    await expect(
      resolveLinuxPanelIframeContent('https://example.com')
    ).resolves.toEqual({
      kind: 'src',
      value: 'https://example.com',
    });
  });
});
