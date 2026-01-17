import { Play, Loader2 } from 'lucide-react';
import { type ComponentProps, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StreamdownContext } from '@/ui/atoms/streamdown/lib/context';
import { cn } from '@/ui/atoms/streamdown/lib/utils';
import { useCodeBlockContext } from '@/ui/atoms/streamdown/lib/code-block/context';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { logger } from '@/lib/logger';

export type RunCodeButtonProps = ComponentProps<'button'> & {
  code?: string;
  language?: string;
  onOutput?: (output: string, error: string) => void;
  onRunningChange?: (isRunning: boolean) => void;
};

interface ExecutionResult {
  stdout: string;
  stderr: string;
}

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

  // Only show run button for Python code
  const isPython = language === 'python' || language === 'py';

  const handleRun = async () => {
    if (!code.trim() || !isPython) return;

    setIsRunning(true);
    onRunningChange?.(true);

    try {
      const result = await invokeCommand<ExecutionResult>(
        TauriCommands.EXECUTE_PYTHON_CODE,
        {
          code,
          version: null, // Use default/latest installed version
        }
      );

      const stdout = result.stdout || '';
      const stderr = result.stderr || '';

      onOutput?.(stdout, stderr);
    } catch (err: unknown) {
      logger.error('Python execution error:', err);
      if (err instanceof Error) {
        onOutput?.('', err.message || 'Error executing Python code');
      } else {
        onOutput?.('', String(err));
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
      disabled={isAnimating || isRunning || !code.trim()}
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
