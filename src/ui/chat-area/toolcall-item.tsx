import { useMemo, useCallback, memo, type MouseEvent } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Wrench,
  AlertCircle,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/atoms/button/button';
import type { Message } from '@/store/types';

export interface ToolCallData {
  id: string;
  name: string;
  arguments: unknown;
  status: string;
  result?: unknown;
  error?: string;
}

export interface ToolCallItemProps {
  message?: Message;
  data?: ToolCallData;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  t: (key: string) => string;
  onRespond?: (allow: boolean) => void;
  userMode?: 'normal' | 'developer';
}

export const ToolCallItem = memo(
  function ToolCallItem({
    message,
    data,
    isExpanded,
    onToggle,
    t,
    onRespond,
    userMode = 'normal',
  }: ToolCallItemProps) {
    const { toolCallData, parseError } = useMemo(() => {
      if (data) return { toolCallData: data, parseError: null };
      if (message) {
        try {
          const parsed = JSON.parse(message.content);
          return { toolCallData: parsed, parseError: null };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            'Failed to parse tool call data:',
            error,
            message.content
          );
          return { toolCallData: null, parseError: errorMessage };
        }
      }
      return { toolCallData: null, parseError: null };
    }, [message, data]);

    const id = message?.id || data?.id;

    const handleToggle = useCallback(() => {
      if (id) {
        onToggle(id);
      }
    }, [id, onToggle]);

    const handleRespond = useCallback(
      (e: MouseEvent<HTMLButtonElement>, allow: boolean) => {
        e.stopPropagation();
        onRespond?.(allow);
      },
      [onRespond]
    );

    if (!toolCallData) {
      if (parseError) {
        return (
          <div className="flex min-w-0 w-full justify-start">
            <div className="flex min-w-0 w-full flex-col gap-2">
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">Tool Call Error</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground break-all">
                  Failed to parse tool call data: {parseError}
                </div>
                {/* Developer mode: show raw content */}
                {userMode === 'developer' && message?.content && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium hover:underline">
                      Raw content
                    </summary>
                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
                      {message.content}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        );
      }
      return null;
    }

    // Check for both "executing" (from Rust backend) and "calling" (legacy)
    const isExecuting =
      toolCallData.status === 'executing' || toolCallData.status === 'calling';
    const isError = toolCallData.status === 'error';
    const isCompleted = toolCallData.status === 'completed';
    const isPending = toolCallData.status === 'pending_permission';

    return (
      <div className="flex min-w-0 w-full justify-start" onClick={handleToggle}>
        <div className="flex min-w-0 w-full flex-col gap-2">
          <div className="rounded-lg border bg-background/50 p-3 text-xs">
            <button
              className="flex w-full items-center justify-between gap-2 text-left"
              disabled={isExecuting && !isPending}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isExecuting ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground animate-spin" />
                ) : (
                  <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="font-medium truncate">
                  {toolCallData.name}
                </span>
                {isExecuting && !isPending && (
                  <span className="text-muted-foreground text-xs">
                    {t('toolCallCalling')}
                  </span>
                )}
                {isPending && (
                  <span className="text-yellow-500 text-xs font-semibold">
                    Permission Required
                  </span>
                )}
                {isError && (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                )}
                {isCompleted && !isError && (
                  <span className="text-muted-foreground">✓</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isPending && onRespond && (
                  <div className="flex items-center gap-1 mr-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-green-500 hover:text-green-600 hover:bg-green-100"
                      onClick={(e: MouseEvent<HTMLButtonElement>) =>
                        handleRespond(e, true)
                      }
                      title="Allow"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e: MouseEvent<HTMLButtonElement>) =>
                        handleRespond(e, false)
                      }
                      title="Deny"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {(!isExecuting || isPending) &&
                  (isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ))}
              </div>
            </button>
            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-in-out',
                isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    'space-y-2 pt-2 transition-opacity duration-300',
                    isExpanded ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <div>
                    <div className="text-muted-foreground mb-1">
                      {t('toolCallInput')}
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(toolCallData.arguments, null, 2)}
                    </pre>
                  </div>
                  {isExecuting && !isPending ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>{t('toolCallExecuting')}</span>
                    </div>
                  ) : isPending ? (
                    <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                      Wait for approval...
                    </div>
                  ) : isError ? (
                    <div>
                      <div className="text-destructive mb-1">
                        {t('toolCallError')}
                      </div>
                      <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                        {toolCallData.error}
                      </div>
                    </div>
                  ) : toolCallData.result !== undefined ? (
                    <div>
                      <div className="text-muted-foreground mb-1">
                        {t('toolCallOutput')}
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(toolCallData.result, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memo
    const prevId = prevProps.message?.id || prevProps.data?.id;
    const nextId = nextProps.message?.id || nextProps.data?.id;

    // Deep compare data if message is missing
    const prevDataStr = prevProps.data
      ? JSON.stringify(prevProps.data)
      : prevProps.message?.content;
    const nextDataStr = nextProps.data
      ? JSON.stringify(nextProps.data)
      : nextProps.message?.content;

    return (
      prevId === nextId &&
      prevDataStr === nextDataStr &&
      prevProps.isExpanded === nextProps.isExpanded &&
      prevProps.userMode === nextProps.userMode
    );
  }
);
