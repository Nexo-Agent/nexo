import { memo, useMemo, useState } from 'react';
import { ChevronRight, Brain, Loader2, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  summarizeActivity,
  type AgentActivity,
  type ActivityStep,
} from './utils/messageGrouping';
import { ToolCallItem } from './ToolCallItem';
import type { PermissionRequest } from '@/features/tools/state/toolPermissionSlice';

interface AgentActivityTimelineProps {
  activity: AgentActivity;
  expandedToolCalls: Record<string, boolean>;
  onToggleToolCall: (key: string, defaultValue: boolean) => void;
  permissionTimeLeft: Record<string, number>;
  onPermissionRespond?: (
    messageId: string,
    toolId: string,
    toolName: string,
    approved: boolean
  ) => void | Promise<void>;
  onCancelToolExecution?: () => void;
  pending: PermissionRequest | null;
  pendingMessageId: string;
  t: (key: string, defaultValue?: string) => string;
}

function createToolCallKey(id: string, type: 'message' | 'permission'): string {
  return `${type}:${id}`;
}

function CompactThinkingRow({
  step,
}: {
  step: Extract<ActivityStep, { kind: 'thinking' }>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(step.isStreaming);

  if (!step.content.trim() && !step.isStreaming) return null;

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group/thought"
    >
      <summary className="flex list-none items-center gap-1.5 py-0.5 text-[11px] text-muted-foreground/80 hover:text-muted-foreground">
        <ChevronRight className="size-3 shrink-0 transition-transform group-open/thought:rotate-90" />
        {step.isStreaming ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-primary/70" />
        ) : (
          <Brain className="size-3 shrink-0" />
        )}
        <span>
          {step.isStreaming
            ? t('thinking', 'Thinking...')
            : t('thought', 'Thought')}
        </span>
      </summary>
      {step.content.trim() ? (
        <div className="ml-4 mt-0.5 max-h-28 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground/75">
          {step.content}
        </div>
      ) : null}
    </details>
  );
}

function CompactSnippetRow({
  step,
}: {
  step: Extract<ActivityStep, { kind: 'snippet' }>;
}) {
  const preview = step.message.content.trim();
  if (!preview) return null;

  const short =
    preview.length > 120 ? `${preview.slice(0, 120).trim()}…` : preview;

  return (
    <div className="flex items-start gap-1.5 py-0.5 text-[11px] text-muted-foreground/75">
      <span className="mt-0.5 size-1 shrink-0 rounded-full bg-muted-foreground/35" />
      <span className="whitespace-pre-wrap leading-relaxed">{short}</span>
    </div>
  );
}

export const AgentActivityTimeline = memo(function AgentActivityTimeline({
  activity,
  expandedToolCalls,
  onToggleToolCall,
  permissionTimeLeft,
  onPermissionRespond,
  onCancelToolExecution,
  pending,
  pendingMessageId,
  t,
}: AgentActivityTimelineProps) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? activity.defaultExpanded;
  const summary = useMemo(
    () => summarizeActivity(activity.steps),
    [activity.steps]
  );

  if (activity.steps.length === 0 && !pending) return null;

  return (
    <div>
      {activity.steps.length > 0 ? (
        <details
          open={open}
          className="group/activity rounded-md border border-border/40 bg-muted/10"
        >
          <summary
            className="flex list-none items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.preventDefault();
              setUserOpen((current) => !(current ?? activity.defaultExpanded));
            }}
          >
            <ChevronRight className="size-3 shrink-0 transition-transform group-open/activity:rotate-90" />
            <Wrench className="size-3 shrink-0 opacity-60" />
            <span className="truncate">{summary}</span>
          </summary>
          <div className="space-y-0.5 border-t border-border/30 px-2 py-1.5">
            {activity.steps.map((step) => {
              if (step.kind === 'thinking') {
                return <CompactThinkingRow key={step.id} step={step} />;
              }
              if (step.kind === 'snippet') {
                return <CompactSnippetRow key={step.id} step={step} />;
              }

              const toolCallKey = createToolCallKey(step.id, 'message');
              return (
                <ToolCallItem
                  key={step.id}
                  message={step.message}
                  data={step.data}
                  variant="compact"
                  isExpanded={expandedToolCalls[toolCallKey] ?? false}
                  onToggle={() => onToggleToolCall(toolCallKey, false)}
                  onCancel={onCancelToolExecution}
                  t={t}
                />
              );
            })}
          </div>
        </details>
      ) : null}

      {pending
        ? pending.toolCalls.map((toolCall) => {
            const toolCallKey = createToolCallKey(toolCall.id, 'permission');
            const timeLeftValue = permissionTimeLeft[pendingMessageId];

            return (
              <div
                key={toolCall.id}
                className={cn(activity.steps.length > 0 && 'mt-1')}
              >
                <ToolCallItem
                  data={{
                    id: toolCall.id,
                    name: toolCall.name,
                    arguments: toolCall.arguments,
                    status: 'pending_permission',
                  }}
                  variant="compact"
                  isExpanded={expandedToolCalls[toolCallKey] ?? true}
                  onToggle={() => onToggleToolCall(toolCallKey, true)}
                  onCancel={onCancelToolExecution}
                  timeLeft={timeLeftValue}
                  t={t}
                  onRespond={
                    onPermissionRespond
                      ? (allow: boolean) =>
                          onPermissionRespond(
                            pendingMessageId,
                            toolCall.id,
                            toolCall.name,
                            allow
                          )
                      : undefined
                  }
                />
              </div>
            );
          })
        : null}
    </div>
  );
});
