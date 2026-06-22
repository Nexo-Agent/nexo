// @ts-nocheck
/**
 * Common languages loaded on demand by Streamdown.
 * Other languages will be loaded from CDN when configured.
 */

import type { LanguageRegistration } from 'shiki';

type LanguageModule = {
 default: LanguageRegistration | LanguageRegistration[];
};
type LanguageLoader = () => Promise<LanguageModule>;

export const bundledLanguageLoaders = {
 javascript: () => import('shiki/langs/javascript.mjs'),
 js: () => import('shiki/langs/javascript.mjs'),
 typescript: () => import('shiki/langs/typescript.mjs'),
 ts: () => import('shiki/langs/typescript.mjs'),
 jsx: () => import('shiki/langs/jsx.mjs'),
 tsx: () => import('shiki/langs/tsx.mjs'),
 html: () => import('shiki/langs/html.mjs'),
 css: () => import('shiki/langs/css.mjs'),
 json: () => import('shiki/langs/json.mjs'),
 bash: () => import('shiki/langs/bash.mjs'),
 shellscript: () => import('shiki/langs/shellscript.mjs'),
 shell: () => import('shiki/langs/shellscript.mjs'),
 sh: () => import('shiki/langs/bash.mjs'),
 yaml: () => import('shiki/langs/yaml.mjs'),
 yml: () => import('shiki/langs/yaml.mjs'),
 toml: () => import('shiki/langs/toml.mjs'),
 python: () => import('shiki/langs/python.mjs'),
 py: () => import('shiki/langs/python.mjs'),
 markdown: () => import('shiki/langs/markdown.mjs'),
 md: () => import('shiki/langs/markdown.mjs'),
 sql: () => import('shiki/langs/sql.mjs'),
 go: () => import('shiki/langs/go.mjs'),
 golang: () => import('shiki/langs/go.mjs'),
} as const satisfies Record<string, LanguageLoader>;

export type BundledLanguageName = keyof typeof bundledLanguageLoaders;

export const bundledLanguageNames = Object.keys(
 bundledLanguageLoaders
) as BundledLanguageName[];

/**
 * Check if a language can be loaded without CDN.
 */
export const isBundledLanguage = (
 language: string
): language is BundledLanguageName => language in bundledLanguageLoaders;

export async function loadBundledLanguage(
 language: BundledLanguageName
): Promise<LanguageRegistration | LanguageRegistration[]> {
 const mod = await bundledLanguageLoaders[language]();
 return mod.default;
}
