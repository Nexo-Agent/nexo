import { beforeEach, describe, expect, it, vi } from 'vitest';
import { absolutePathToFileUrl } from './fileUrl';

const invokeCommand = vi.fn();

vi.mock('@/lib/tauri', () => ({
  invokeCommand: (...args: unknown[]) => invokeCommand(...args),
  TauriCommands: { PATH_TO_FILE_URL: 'path_to_file_url' },
}));

describe('absolutePathToFileUrl', () => {
  beforeEach(() => {
    invokeCommand.mockReset();
  });

  it('delegates to the Rust path_to_file_url command', async () => {
    invokeCommand.mockResolvedValue('file:///Users/me/artifacts/chart.html');

    await expect(
      absolutePathToFileUrl('/Users/me/artifacts/chart.html')
    ).resolves.toBe('file:///Users/me/artifacts/chart.html');

    expect(invokeCommand).toHaveBeenCalledWith('path_to_file_url', {
      path: '/Users/me/artifacts/chart.html',
    });
  });

  it('trims whitespace before invoking', async () => {
    invokeCommand.mockResolvedValue('file:///Users/me/chart.html');

    await absolutePathToFileUrl(' /Users/me/chart.html ');

    expect(invokeCommand).toHaveBeenCalledWith('path_to_file_url', {
      path: '/Users/me/chart.html',
    });
  });
});
