import { useEffect, useRef, useState } from 'react';
import { Play, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { cn } from '@/lib/utils';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { logger } from '@/lib/logger';

interface PythonExecutorProps {
  code: string;
  className?: string;
  version?: string; // Optional python version
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
}

export function PythonExecutor({
  code,
  className,
  version,
}: PythonExecutorProps) {
  const { t } = useTranslation('common');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Scroll to output when it updates
  useEffect(() => {
    if (outputRef.current && (output || error)) {
      outputRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [output, error]);

  const handleRun = async () => {
    if (!code.trim()) return;

    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      const result = await invokeCommand<ExecutionResult>(
        TauriCommands.EXECUTE_PYTHON_CODE,
        {
          code,
          version: version || null,
        }
      );

      setOutput(result.stdout || '(No output)');
      if (result.stderr) {
        setError(result.stderr);
      }
    } catch (err: unknown) {
      logger.error('Python execution error:', err);
      // Backend errors usually come in a specific format but invokeCommand might throw
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy code from PythonExecutor:', err);
    }
  };

  return (
    <div className={cn('my-4', className)}>
      {/* Code block with run button */}
      <div className="relative group">
        <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-sm my-2">
          <code>{code}</code>
        </pre>
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/80 hover:bg-background"
            onClick={handleCopy}
            title={t('copyCode')}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="bg-primary text-primary-foreground"
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
            title={t('runPythonCode')}
          >
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">{t('run')}</span>
          </Button>
        </div>
      </div>

      {/* Output area */}
      {(output || error || isRunning) && (
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
      )}
    </div>
  );
}
