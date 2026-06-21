import type { ReactNode } from 'react';
import { getLanguageLabel } from './constants';

type CodeBlockHeaderProps = {
 language: string;
 children: ReactNode;
 leading?: ReactNode;
};

export const CodeBlockHeader = ({
 language,
 children,
 leading,
}: CodeBlockHeaderProps) => (
 <div
 className="flex h-7 items-center justify-between gap-2 border-b border-border/35 px-2"
 data-language={language}
 data-streamdown="code-block-header"
 >
 <div className="flex min-w-0 items-center gap-2">
 <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/75">
 {getLanguageLabel(language)}
 </span>
 {leading}
 </div>
 <div className="flex shrink-0 items-center gap-0.5">{children}</div>
 </div>
);
