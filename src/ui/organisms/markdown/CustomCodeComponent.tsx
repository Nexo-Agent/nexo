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
import { HTML_PREVIEW_FENCE_LANGUAGE } from '@/features/chat/lib/html-preview';
import { BROWSER_FENCE_LANGUAGE } from '@/features/chat/lib/html-preview/constants';
import { useMarkdownMessageId } from './MarkdownMessageContext';
import { HtmlPreviewSkeleton } from '@/features/chat/ui/html-preview/HtmlPreviewSkeleton';
import { BrowserStreamSkeleton } from '@/features/browser/ui/BrowserStreamSkeleton';
import { RunCodeButton } from './RunCodeButton';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BrowserFenceComponent = lazy(() =>
  import('@/features/browser/ui/BrowserFenceComponent').then((mod) => ({
    default: mod.BrowserFenceComponent,
  }))
);

const HtmlPreviewComponent = lazy(() =>
  import('@/features/chat/ui/html-preview/HtmlPreviewComponent').then(
    (mod) => ({
      default: mod.HtmlPreviewComponent,
    })
  )
);

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
      className="mt-2 overflow-hidden rounded-xl border border-border/70 bg-card/60 text-sm shadow-sm"
    >
      {isRunning && (
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-3 py-2 text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs">{t('executing')}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <pre className="flex-1 whitespace-pre-wrap wrap-break-words font-mono text-xs leading-relaxed">
            {error}
          </pre>
        </div>
      )}
      {output && !error && (
        <div className="px-3 py-2">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('output')}
          </div>
          <pre className="whitespace-pre-wrap wrap-break-words font-mono text-[13px] leading-relaxed text-foreground">
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
  const messageId = useMarkdownMessageId();

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
          'rounded-md border border-border/50 bg-muted/45 px-1.5 py-0.5 font-mono text-[0.875em] text-foreground',
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

  if (language === BROWSER_FENCE_LANGUAGE) {
    return (
      <Suspense fallback={<BrowserStreamSkeleton className={className} />}>
        <BrowserFenceComponent
          code={code}
          messageId={messageId ?? code}
          className={className}
        />
      </Suspense>
    );
  }

  if (language === HTML_PREVIEW_FENCE_LANGUAGE) {
    return (
      <Suspense fallback={<HtmlPreviewSkeleton className={className} />}>
        <HtmlPreviewComponent code={code} className={className} />
      </Suspense>
    );
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
    <div className="my-1">
      <Suspense fallback={<CodeBlockSkeleton />}>
        <CodeBlock code={code} language={language}>
          {enhancedControlElements}
        </CodeBlock>
      </Suspense>
      <CodeOutput output={output} error={error} isRunning={isRunning} />
    </div>
  );
};
