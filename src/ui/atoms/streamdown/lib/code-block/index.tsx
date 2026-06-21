// @ts-nocheck
import { type HTMLAttributes, type ReactNode } from 'react';
import { CodeBlockBody } from './body';
import { CodeBlockContainer } from './container';
import { CodeBlockContext } from './context';
import { CodeBlockHeader } from './header';
import { CodeBlockCopyButton } from './copy-button';
import { PreviewCodeBlock } from './preview-code-block';
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
 const result = useHighlightedCode(code, language);

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
 </CodeBlockContainer>
 </CodeBlockContext.Provider>
 );
};

export { PreviewCodeBlock, useHighlightedCode };
export type { CodeBlockView } from './view-tabs';
