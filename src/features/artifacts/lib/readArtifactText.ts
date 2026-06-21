import { readFile } from '@tauri-apps/plugin-fs';

/** Read artifact text via `readFile` (scoped under `$APPDATA/artifacts/**`). */
export async function readArtifactTextFile(path: string): Promise<string> {
  const bytes = await readFile(path.trim());
  return new TextDecoder().decode(bytes);
}
