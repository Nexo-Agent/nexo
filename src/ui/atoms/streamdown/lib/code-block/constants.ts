import { cn } from '../utils';

export const CODE_BLOCK_ACTION_CLASS = cn(
  'inline-flex size-6 shrink-0 items-center justify-center rounded-sm',
  'text-muted-foreground/80 transition-colors',
  'hover:bg-muted/60 hover:text-foreground',
  'disabled:pointer-events-none disabled:opacity-35'
);

const LANGUAGE_LABELS: Record<string, string> = {
  bash: 'Bash',
  browser: 'Browser',
  css: 'CSS',
  go: 'Go',
  html: 'HTML',
  javascript: 'JavaScript',
  js: 'JavaScript',
  json: 'JSON',
  jsx: 'JSX',
  markdown: 'Markdown',
  md: 'Markdown',
  mermaid: 'Mermaid',
  py: 'Python',
  python: 'Python',
  shell: 'Shell',
  sh: 'Shell',
  sql: 'SQL',
  toml: 'TOML',
  ts: 'TypeScript',
  tsx: 'TSX',
  typescript: 'TypeScript',
  yaml: 'YAML',
  yml: 'YAML',
};

export function getLanguageLabel(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (!normalized) return 'Code';
  return LANGUAGE_LABELS[normalized] ?? normalized.toUpperCase();
}
