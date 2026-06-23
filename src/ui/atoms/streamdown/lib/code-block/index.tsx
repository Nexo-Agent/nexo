// @ts-nocheck
import {
 type HTMLAttributes,
 type ReactNode,
 useEffect,
 useMemo,
 useState,
} from 'react';
import { CodeBlockBody } from './body';
import { CodeBlockContainer } from './container';
import { CodeBlockContext } from './context';
import { CodeBlockExpandButton } from './expand-button';
import { CodeBlockHeader } from './header';
import { CodeBlockCopyButton } from './copy-button';
import { PreviewCodeBlock } from './preview-code-block';
import { getTruncatedCodeState } from './truncate';
import { useHighlightedCode } from './use-highlighted-code';

type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
 code: string;
 language: string;
 headerActions?: ReactNode;
};

export const CodeBlock = ({
 code,
 language,
 className,
 children,
 headerActions,
 ...rest
}: CodeBlockProps) => {
 const [isExpanded, setIsExpanded] = useState(false);
 const { collapsedCode, hasOverflow, lineCount, visibleLineCount } = useMemo(
 () => getTruncatedCodeState(code),
 [code]
 );
 const visibleCode = hasOverflow && !isExpanded ? collapsedCode : code;
 const result = useHighlightedCode(visibleCode, language);

 useEffect(() => {
 setIsExpanded(false);
 }, [code]);

 return (
 <CodeBlockContext.Provider value={{ code }}>
 <CodeBlockContainer language={language}>
 <CodeBlockHeader language={language}>
 <CodeBlockCopyButton />
 {headerActions}
 {children}
 </CodeBlockHeader>
 <CodeBlockBody
 className={className}
 language={language}
 result={result}
 {...rest}
 />
 {hasOverflow ? (
 <CodeBlockExpandButton
 expanded={isExpanded}
 hiddenLineCount={Math.max(0, lineCount - visibleLineCount)}
 onToggle={() => setIsExpanded((current) => !current)}
 />
 ) : null}
 </CodeBlockContainer>
 </CodeBlockContext.Provider>
 );
};

export { PreviewCodeBlock, useHighlightedCode };
export type { CodeBlockView } from './view-tabs';
