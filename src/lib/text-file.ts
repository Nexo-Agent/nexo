/** Text-like MIME types that are safe to extract as UTF-8 (keep in sync with Rust `files.rs`). */

export const TEXT_LIKE_APPLICATION_MIMES = [
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/yaml',
  'application/x-yaml',
  'application/javascript',
  'application/typescript',
  'application/sql',
  'application/toml',
  'application/graphql',
  'application/x-sh',
] as const;

/** Common source/config extensions when the browser reports an empty or generic MIME. */
export const TEXT_EXTRACTABLE_EXTENSIONS = [
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.json',
  '.jsonl',
  '.ndjson',
  '.yaml',
  '.yml',
  '.xml',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.less',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.kt',
  '.sql',
  '.sh',
  '.bash',
  '.toml',
  '.ini',
  '.env',
  '.log',
  '.cfg',
  '.conf',
  '.vue',
  '.svelte',
  '.graphql',
  '.gql',
] as const;

const EXTENSION_TO_MIME: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  jsonl: 'application/json',
  ndjson: 'application/json',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  xml: 'application/xml',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  scss: 'text/x-scss',
  less: 'text/x-less',
  js: 'application/javascript',
  jsx: 'application/javascript',
  mjs: 'application/javascript',
  cjs: 'application/javascript',
  ts: 'application/typescript',
  tsx: 'application/typescript',
  py: 'text/x-python',
  rs: 'text/x-rust',
  go: 'text/x-go',
  java: 'text/x-java',
  kt: 'text/x-kotlin',
  sql: 'application/sql',
  sh: 'application/x-sh',
  bash: 'application/x-sh',
  toml: 'application/toml',
  ini: 'text/plain',
  env: 'text/plain',
  log: 'text/plain',
  cfg: 'text/plain',
  conf: 'text/plain',
  vue: 'text/plain',
  svelte: 'text/plain',
  graphql: 'application/graphql',
  gql: 'application/graphql',
};

export function mimeFromFileName(fileName: string): string | null {
  const dot = fileName.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = fileName.slice(dot + 1).toLowerCase();
  return EXTENSION_TO_MIME[ext] ?? null;
}

export function isTextLikeMime(mime: string): boolean {
  const normalized = mime.trim().toLowerCase();
  if (!normalized || normalized === 'application/octet-stream') {
    return false;
  }
  if (normalized.startsWith('text/')) {
    return true;
  }
  return (TEXT_LIKE_APPLICATION_MIMES as readonly string[]).includes(
    normalized
  );
}

export function hasTextExtractableExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return TEXT_EXTRACTABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Resolve the best MIME for validation and data URLs (type first, then extension). */
export function getEffectiveFileMime(file: File): string {
  const fromType = file.type.trim().toLowerCase();
  if (fromType && fromType !== 'application/octet-stream') {
    return fromType;
  }
  return mimeFromFileName(file.name) ?? fromType;
}

export function isTextExtractableFile(file: File): boolean {
  const mime = getEffectiveFileMime(file);
  if (isTextLikeMime(mime)) {
    return true;
  }
  return hasTextExtractableExtension(file.name);
}

export function isExtractableDocumentFile(file: File): boolean {
  const mime = getEffectiveFileMime(file);
  return mime === 'application/pdf' || isTextExtractableFile(file);
}

/** Patch data URLs when the browser reports a generic octet-stream MIME. */
export function normalizeDataUrlMime(dataUrl: string, file: File): string {
  const effectiveMime = getEffectiveFileMime(file);
  if (!effectiveMime || effectiveMime === 'application/octet-stream') {
    return dataUrl;
  }
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return dataUrl;
  }
  return `data:${effectiveMime};base64,${dataUrl.slice(commaIdx + 1)}`;
}

export function getTextExtractableAcceptList(): string {
  return [
    'text/*',
    ...TEXT_LIKE_APPLICATION_MIMES,
    ...TEXT_EXTRACTABLE_EXTENSIONS,
  ].join(',');
}
