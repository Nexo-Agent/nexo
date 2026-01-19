import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/ui/atoms/card';
import { Badge } from '@/ui/atoms/badge';
import { BaseHandle } from '@/ui/atoms/xyflow/base-handle';
import { cn } from '@/lib/utils';

// Định nghĩa các kiểu dữ liệu cho RichNode
export interface RichNodeData {
  label?: string;
  description?: string;
  icon?: string;
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'warning';
  status?: 'idle' | 'running' | 'error' | 'success';
  tags?: string[];
  handlePosition?: 'horizontal' | 'vertical';
  handles?: {
    target?: boolean;
    source?: boolean;
    targetLabel?: string;
    sourceLabel?: string;
  };
}

// Mapping màu sắc theo variant
const variantStyles = {
  default: 'border-border hover:border-muted-foreground/50',
  primary:
    'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700',
  danger:
    'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/30 hover:border-red-300 dark:hover:border-red-700',
  success:
    'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/30 hover:border-green-300 dark:hover:border-green-700',
  warning:
    'border-yellow-200 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-950/30 hover:border-yellow-300 dark:hover:border-yellow-700',
};

// Mapping status indicator
const statusStyles = {
  idle: 'bg-gray-400 dark:bg-gray-500',
  running:
    'bg-blue-500 dark:bg-blue-400 animate-pulse shadow-lg shadow-blue-500/50',
  error: 'bg-red-500 dark:bg-red-400 shadow-lg shadow-red-500/50',
  success: 'bg-green-500 dark:bg-green-400 shadow-lg shadow-green-500/50',
};

const statusLabels = {
  idle: 'Chờ',
  running: 'Đang chạy',
  error: 'Lỗi',
  success: 'Hoàn thành',
};

// Badge variant mapping
const badgeVariantMap = {
  default: 'secondary' as const,
  primary: 'default' as const,
  danger: 'destructive' as const,
  success: 'secondary' as const,
  warning: 'outline' as const,
};

export const RichNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as RichNodeData;
  const {
    label = 'Rich Node',
    description,
    icon,
    variant = 'default',
    status,
    tags = [],
    handlePosition = 'horizontal',
    handles = { target: true, source: true },
  } = nodeData;

  // Xác định vị trí handle
  const targetPosition =
    handlePosition === 'horizontal' ? Position.Left : Position.Top;
  const sourcePosition =
    handlePosition === 'horizontal' ? Position.Right : Position.Bottom;

  return (
    <Card
      className={cn(
        'min-w-[200px] max-w-[320px] transition-all duration-200',
        'hover:shadow-md',
        variantStyles[variant],
        selected && 'ring-2 ring-primary shadow-lg scale-[1.02]',
        // React Flow node selection styling
        '[.react-flow__node.selected_&]:ring-2',
        '[.react-flow__node.selected_&]:ring-primary',
        '[.react-flow__node.selected_&]:shadow-lg'
      )}
    >
      {/* Header với icon, title và status */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {icon && (
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-xl bg-background/50 rounded-md border">
                {icon}
              </div>
            )}
            <CardTitle className="text-sm font-semibold truncate leading-tight">
              {label}
            </CardTitle>
          </div>

          {/* Status indicator */}
          {status && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className={cn('w-2.5 h-2.5 rounded-full', statusStyles[status])}
                title={statusLabels[status]}
              />
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <CardDescription className="text-xs leading-relaxed mt-1.5 line-clamp-2">
            {description}
          </CardDescription>
        )}
      </CardHeader>

      {/* Content - Tags/Badges */}
      {tags.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <Badge
                key={index}
                variant={badgeVariantMap[variant]}
                className="text-[10px] px-1.5 py-0 h-5"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}

      {/* Handles với labels */}
      {handles.target && (
        <>
          <BaseHandle type="target" position={targetPosition} />
          {handles.targetLabel && (
            <div
              className={cn(
                'absolute text-[9px] font-semibold text-muted-foreground uppercase tracking-wide bg-background/80 px-1 rounded',
                handlePosition === 'horizontal'
                  ? '-left-14 top-1/2 -translate-y-1/2'
                  : 'left-1/2 -translate-x-1/2 -top-6'
              )}
            >
              {handles.targetLabel}
            </div>
          )}
        </>
      )}

      {handles.source && (
        <>
          <BaseHandle type="source" position={sourcePosition} />
          {handles.sourceLabel && (
            <div
              className={cn(
                'absolute text-[9px] font-semibold text-muted-foreground uppercase tracking-wide bg-background/80 px-1 rounded',
                handlePosition === 'horizontal'
                  ? '-right-16 top-1/2 -translate-y-1/2'
                  : 'left-1/2 -translate-x-1/2 -bottom-6'
              )}
            >
              {handles.sourceLabel}
            </div>
          )}
        </>
      )}
    </Card>
  );
});

RichNode.displayName = 'RichNode';
