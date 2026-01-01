import {
  Suspense,
  isValidElement,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { lazy } from 'react';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import { CodeBlockSkeleton } from '@/ui/atoms/streamdown/lib/code-block/skeleton';
import type { ExtraProps } from '@/ui/atoms/streamdown/lib/markdown';
import { cn } from '@/ui/atoms/streamdown/lib/utils';
import { MermaidComponent } from '@/ui/atoms/streamdown/lib/mermaid-component';
import { RunCodeButton } from './RunCodeButton';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CodeBlock = lazy(() =>
  import('@/ui/atoms/streamdown/lib/code-block').then((mod) => ({
    default: mod.CodeBlock,
  }))
);
const LANGUAGE_REGEX = /language-([^\s]+)/;

// Component to display code execution output
const CodeOutput = ({
  output,
  error,
  isRunning,
}: {
  output: string;
  error: string;
  isRunning: boolean;
}) => {
  const { t } = useTranslation('common');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current && (output || error)) {
      outputRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [output, error]);

  if (!output && !error && !isRunning) {
    return null;
  }

  return (
    <div
      ref={outputRef}
      className="mt-2 rounded-lg border bg-background p-3 text-sm"
    >
      {isRunning && (
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{t('executing')}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 text-destructive mb-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <pre className="whitespace-pre-wrap wrap-break-words flex-1">
            {error}
          </pre>
        </div>
      )}
      {output && !error && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {t('output')}
          </div>
          <pre className="whitespace-pre-wrap wrap-break-words text-foreground">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
};

export const CustomCodeComponent = ({
  node,
  className,
  children,
  controlElements,
  ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> &
  ExtraProps & { controlElements?: React.ReactNode }) => {
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL LOGIC OR EARLY RETURNS
  // This ensures hooks are always called in the same order on every render

  // State for code execution output
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const handleOutput = useCallback((out: string, err: string) => {
    setOutput(out);
    setError(err);
    setIsRunning(false);
  }, []);

  const handleRunningChange = useCallback((running: boolean) => {
    setIsRunning(running);
  }, []);

  // Now we can do conditional logic after all hooks are called
  const inline = node?.position?.start.line === node?.position?.end.line;

  // Extract language
  const match = className?.match(LANGUAGE_REGEX);
  const language = match ? match[1] : '';

  // Extract code content
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

  // For inline code, use original component
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

  // For mermaid, use original component
  if (language === 'mermaid') {
    return <MermaidComponent code={code} className={className} />;
  }

  // For code blocks, add run button to controlElements

  const enhancedControlElements = (
    <>
      {controlElements}
      <RunCodeButton
        code={code}
        language={language}
        onOutput={handleOutput}
        onRunningChange={handleRunningChange}
      />
    </>
  );

  return (
    <div className="my-2">
      <Suspense fallback={<CodeBlockSkeleton />}>
        <CodeBlock
          className={cn('overflow-x-auto border-border border-t', className)}
          code={code}
          language={language}
        >
          {enhancedControlElements}
        </CodeBlock>
      </Suspense>
      <CodeOutput output={output} error={error} isRunning={isRunning} />
    </div>
  );
};
