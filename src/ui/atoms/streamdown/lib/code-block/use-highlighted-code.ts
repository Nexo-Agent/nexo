// @ts-nocheck
import { useContext, useEffect, useMemo, useState } from 'react';
import type { TokensResult } from 'shiki';
import { logger } from '@/lib/logger';
import { StreamdownContext } from '../context';

function buildFallbackTokens(code: string): TokensResult {
 return {
 bg: 'transparent',
 fg: 'inherit',
 tokens: code.split('\n').map((line) => [
 {
 content: line,
 bgColor: 'transparent',
 htmlStyle: { color: 'var(--color-foreground)' },
 offset: 0,
 },
 ]),
 };
}

export function useHighlightedCode(code: string, language: string) {
 const { shikiTheme, cdnUrl } = useContext(StreamdownContext);
 const fallback = useMemo(() => buildFallbackTokens(code), [code]);
 const [result, setResult] = useState<TokensResult>(fallback);

 useEffect(() => {
	 setResult(fallback);

	 let cancelled = false;

	 import('./highlight')
	 .then(({ getHighlightedTokens }) => {
	 if (cancelled) {
	 return;
	 }

	 const cachedResult = getHighlightedTokens({
	 code,
	 language,
	 shikiTheme,
	 cdnUrl,
	 });

	 if (cachedResult) {
	 setResult(cachedResult);
	 return;
	 }

	 getHighlightedTokens({
	 code,
	 language,
	 shikiTheme,
	 cdnUrl,
	 callback: (nextResult) => {
	 if (!cancelled) {
	 setResult(nextResult);
	 }
	 },
	 });
	 })
	 .catch((error) => {
	 logger.error('Failed to load code highlighter:', error);
	 });

	 return () => {
	 cancelled = true;
	 };
	 }, [code, language, shikiTheme, cdnUrl, fallback]);

 return result;
}
