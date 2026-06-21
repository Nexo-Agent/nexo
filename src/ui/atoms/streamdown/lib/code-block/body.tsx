// @ts-nocheck
import { type ComponentProps, memo, useMemo } from 'react';
import type { TokensResult } from 'shiki';
import { cn } from '../utils';
import { parseShikiRootStyle } from './shiki-styles';

type CodeBlockBodyProps = ComponentProps<'pre'> & {
 result: TokensResult;
 language: string;
};

const LINE_NUMBER_CLASS = cn(
 'sticky left-0 z-[1] w-11 shrink-0 select-none',
 'border-r border-border/35 bg-muted/20 px-2.5',
 'text-right font-mono text-[11px] leading-[1.65] tabular-nums text-muted-foreground/45'
);

const LINE_CONTENT_CLASS = 'min-w-0 flex-1 px-4 py-0 leading-[1.65] whitespace-pre';

export const CodeBlockBody = memo(
 ({ children, result, language, className, ...rest }: CodeBlockBodyProps) => {
 const preStyle = useMemo(
 () => parseShikiRootStyle(String(result.fg ?? ''), String(result.bg ?? '')),
 [result.fg, result.bg]
 );

 return (
 <div
 className={cn(
 'overflow-x-auto',
 '[scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent]'
 )}
 >
 <pre
 className={cn(
 className,
 'shiki m-0 min-w-full bg-[#f6f8fa] py-2 text-[13px] font-mono text-foreground dark:bg-[#0d1117]'
 )}
 data-language={language}
 data-streamdown="code-block-body"
 style={preStyle}
 {...rest}
 >
 <code className="block min-w-max">
 {result.tokens.map((row, lineIndex) => (
 <div
 className="flex min-w-max"
 // biome-ignore lint/suspicious/noArrayIndexKey: line order is stable for static code blocks
 key={lineIndex}
 >
 <span aria-hidden className={LINE_NUMBER_CLASS}>
 {lineIndex + 1}
 </span>
 <span className={LINE_CONTENT_CLASS}>
 {row.map((token, tokenIndex) => (
 <span
 className="dark:bg-(--shiki-dark-bg)! dark:text-(--shiki-dark)!"
 // biome-ignore lint/suspicious/noArrayIndexKey: token order is stable within a line
 key={tokenIndex}
 style={{
 color: token.color,
 backgroundColor: token.bgColor,
 ...token.htmlStyle,
 }}
 {...token.htmlAttrs}
 >
 {token.content}
 </span>
 ))}
 </span>
 </div>
 ))}
 </code>
 </pre>
 </div>
 );
 },
 (prevProps, nextProps) =>
 prevProps.result === nextProps.result &&
 prevProps.language === nextProps.language &&
 prevProps.className === nextProps.className
);
