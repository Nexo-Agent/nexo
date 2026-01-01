import React, { Suspense, isValidElement } from 'react';
import { lazy } from 'react';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import { CodeBlockSkeleton } from './code-block/skeleton';
import type { ExtraProps } from './markdown';
import { cn } from './utils';
import { MermaidComponent } from './mermaid-component';

const CodeBlock = lazy(() =>
  import('./code-block').then((mod) => ({ default: mod.CodeBlock }))
);
const LANGUAGE_REGEX = /language-([^\s]+)/;

export const CodeComponent = ({
  node,
  className,
  children,
  controlElements,
  ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> &
  ExtraProps & { controlElements?: React.ReactNode }) => {
  const inline = node?.position?.start.line === node?.position?.end.line;

  if (inline) {
    return (
      <code
        className={cn(
          'rounded bg-muted px-1.5 py-0.5 font-mono text-sm',
          className
        )}
        data-streamdown="inline-code"
        {...props}
      >
        {children}
      </code>
    );
  }

  const match = className?.match(LANGUAGE_REGEX);
  const language = match?.at(1) ?? '';

  // Extract code content from children safely
  let code = '';
  if (
    isValidElement(children) &&
    children.props &&
    typeof children.props === 'object' &&
    'children' in children.props &&
    typeof children.props.children === 'string'
  ) {
    code = children.props.children;
  } else if (typeof children === 'string') {
    code = children;
  }

  if (language === 'mermaid') {
    return <MermaidComponent code={code} className={className} />;
  }

  return (
    <Suspense fallback={<CodeBlockSkeleton />}>
      <CodeBlock
        className={cn('overflow-x-auto border-border border-t', className)}
        code={code}
        language={language}
      >
        {controlElements || null}
      </CodeBlock>
    </Suspense>
  );
};
