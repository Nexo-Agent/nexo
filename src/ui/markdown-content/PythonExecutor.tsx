import { useEffect, useRef, useState } from 'react';
import { Play, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { cn } from '@/lib/utils';
import type { PyodideInterface } from 'pyodide';
import { loadPyodide, getPyodideState } from '@/lib/pyodide-loader';

interface PythonExecutorProps {
  code: string;
  className?: string;
}

export function PythonExecutor({ code, className }: PythonExecutorProps) {
  const { t } = useTranslation('common');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const pyodideRef = useRef<PyodideInterface | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Load Pyodide using shared loader (cached)
  useEffect(() => {
    let mounted = true;

    const initializePyodide = async () => {
      try {
        // Check if already loaded
        const state = getPyodideState();
        if (state.pyodide) {
          if (mounted) {
            pyodideRef.current = state.pyodide;
            setIsLoaded(true);
          }
          return;
        }

        // Load Pyodide (will use cache if already loading)
        const pyodide = await loadPyodide();

        if (mounted) {
          pyodideRef.current = pyodide;
          setIsLoaded(true);
        }
      } catch (err: unknown) {
        console.error('Error loading Pyodide:', err);
        if (mounted) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError(String(err));
          }
        }
      }
    };

    initializePyodide();

    return () => {
      mounted = false;
    };
  }, []);

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
    if (!pyodideRef.current || !code.trim()) return;

    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      // Capture stdout
      let stdout = '';
      pyodideRef.current.setStdout({
        batched: (text: string) => {
          stdout += text;
        },
      });

      // Capture stderr
      let stderr = '';
      pyodideRef.current.setStderr({
        batched: (text: string) => {
          stderr += text;
        },
      });

      // Run the code
      const result = await pyodideRef.current.runPythonAsync(code);

      // Combine output
      let finalOutput = stdout;
      if (result !== undefined && result !== null) {
        if (finalOutput) finalOutput += '\n';
        finalOutput += String(result);
      }

      setOutput(finalOutput || '(Không có output)');
      if (stderr) {
        setError(stderr);
      }
    } catch (err: unknown) {
      console.error('Python execution error:', err);
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
      console.error('Failed to copy:', err);
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
            disabled={!isLoaded || isRunning || !code.trim()}
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

      {!isLoaded && !error && (
        <div className="mt-2 text-xs text-muted-foreground">
          {t('loadingPythonRuntime')}
        </div>
      )}
    </div>
  );
}
