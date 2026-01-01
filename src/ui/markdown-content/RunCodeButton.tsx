import { Play, Loader2 } from 'lucide-react';
import {
  type ComponentProps,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { StreamdownContext } from '@/ui/atoms/streamdown/lib/context';
import { cn } from '@/ui/atoms/streamdown/lib/utils';
import { useCodeBlockContext } from '@/ui/atoms/streamdown/lib/code-block/context';
import type { PyodideInterface } from 'pyodide';
import { loadPyodide, getPyodideState } from '@/lib/pyodide-loader';

export type RunCodeButtonProps = ComponentProps<'button'> & {
  code?: string;
  language?: string;
  onOutput?: (output: string, error: string) => void;
  onRunningChange?: (isRunning: boolean) => void;
};

export const RunCodeButton = ({
  code: propCode,
  language,
  onOutput,
  onRunningChange,
  className,
  children,
  ...props
}: RunCodeButtonProps) => {
  const { t } = useTranslation('common');
  const { code: contextCode } = useCodeBlockContext();
  const { isAnimating } = useContext(StreamdownContext);
  const code = propCode ?? contextCode;
  const [isRunning, setIsRunning] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const pyodideRef = useRef<PyodideInterface | null>(null);

  // Only show run button for Python code
  const isPython = language === 'python' || language === 'py';

  // Load Pyodide
  useEffect(() => {
    if (!isPython) return;

    let mounted = true;

    const initializePyodide = async () => {
      try {
        const state = getPyodideState();
        if (state.pyodide) {
          if (mounted) {
            pyodideRef.current = state.pyodide;
            setIsLoaded(true);
          }
          return;
        }

        const pyodide = await loadPyodide();
        if (mounted) {
          pyodideRef.current = pyodide;
          setIsLoaded(true);
        }
      } catch (err: unknown) {
        console.error('Error loading Pyodide:', err);
        if (mounted) {
          setIsLoaded(false);
        }
      }
    };

    initializePyodide();

    return () => {
      mounted = false;
    };
  }, [isPython]);

  const handleRun = async () => {
    if (!pyodideRef.current || !code.trim() || !isPython) return;

    setIsRunning(true);
    onRunningChange?.(true);

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

      onOutput?.(finalOutput || '', stderr);
    } catch (err: unknown) {
      console.error('Python execution error:', err);
      if (err instanceof Error) {
        onOutput?.('', err.message || 'Lỗi khi thực thi Python code');
      }
    } finally {
      setIsRunning(false);
      onRunningChange?.(false);
    }
  };

  if (!isPython) {
    return null;
  }

  return (
    <button
      className={cn(
        'cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      data-streamdown="code-block-run-button"
      disabled={isAnimating || !isLoaded || isRunning || !code.trim()}
      onClick={handleRun}
      title={t('runPythonCode')}
      type="button"
      {...props}
    >
      {children ??
        (isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        ))}
    </button>
  );
};
