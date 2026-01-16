import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

/**
 * Process Node - Rectangle shape
 * Represents a processing step or action in the algorithm
 */
export const ProcessNode = memo(({ data, selected }: NodeProps) => {
  const label = (data.label as string) || 'Process';

  return (
    <div
      className={cn(
        'relative min-w-[120px] px-4 py-3',
        'bg-blue-50 dark:bg-blue-950',
        'border-2 border-blue-500',
        'rounded-md',
        'text-center text-sm font-medium',
        selected && 'ring-2 ring-blue-600 shadow-lg'
      )}
    >
      <div className="text-blue-900 dark:text-blue-100">{label}</div>

      {/* Target handle on the left */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />

      {/* Source handle on the right */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
    </div>
  );
});

ProcessNode.displayName = 'ProcessNode';

/**
 * Input/Output Node - Parallelogram shape
 * Represents data input or output operations
 */
export const InputOutputNode = memo(({ data, selected }: NodeProps) => {
  const label = (data.label as string) || 'Input/Output';

  return (
    <div className="relative">
      <div
        className={cn(
          'min-w-[140px] px-8 py-3',
          'bg-green-50 dark:bg-green-950',
          'border-2 border-green-500',
          'text-center text-sm font-medium',
          '-skew-x-[20deg]', // Create parallelogram shape
          selected && 'ring-2 ring-green-600 shadow-lg'
        )}
      >
        {/* Anti-skew the text so it stays upright */}
        <div className="skew-x-[20deg] text-green-900 dark:text-green-100">
          {label}
        </div>
      </div>

      {/* Target handle on the left */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500 border-2 border-white -left-1"
      />

      {/* Source handle on the right */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-white -right-1"
      />
    </div>
  );
});

InputOutputNode.displayName = 'InputOutputNode';

/**
 * Decision Node - Diamond shape
 * Represents a branching point in the algorithm (if/else, switch)
 */
export const DecisionNode = memo(({ data, selected }: NodeProps) => {
  const label = (data.label as string) || 'Decision';

  return (
    <div className="relative flex items-center justify-center w-44 h-24">
      {/* Flattened Diamond Shape using SVG */}
      <svg
        className={cn(
          'absolute inset-0 w-full h-full drop-shadow-sm',
          selected && 'filter drop-shadow-[0_0_8px_rgba(202,138,4,0.5)]'
        )}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M 50 2 L 98 50 L 50 98 L 2 50 Z"
          className={cn(
            'fill-yellow-50 dark:fill-yellow-950 stroke-2 transition-colors',
            selected ? 'stroke-yellow-600' : 'stroke-yellow-500'
          )}
        />
      </svg>

      <div className="relative z-10 text-yellow-900 dark:text-yellow-100 text-center text-sm font-medium px-10">
        {label}
      </div>

      {/* Input Target - Left */}
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
        IN
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-yellow-500 border-2 border-white"
      />

      {/* True Output - Right */}
      <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600">
        TRUE
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 bg-emerald-500 border-2 border-white"
      />

      {/* False Output - Bottom */}
      <div className="absolute left-1/2 -bottom-6 -translate-x-1/2 text-[10px] font-bold text-red-600">
        FALSE
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 bg-red-500 border-2 border-white"
      />
    </div>
  );
});

DecisionNode.displayName = 'DecisionNode';

/**
 * Start/End Node - Oval/Rounded shape
 * Represents the start or end point of the algorithm
 */
export const StartEndNode = memo(({ data, selected }: NodeProps) => {
  const label = (data.label as string) || 'Start/End';
  const isStart = (data.nodeType as string) === 'start';

  return (
    <div
      className={cn(
        'relative min-w-[100px] px-6 py-3',
        isStart
          ? 'bg-purple-50 dark:bg-purple-950 border-purple-500'
          : 'bg-red-50 dark:bg-red-950 border-red-500',
        'border-2',
        'rounded-full',
        'text-center text-sm font-medium',
        selected &&
          (isStart
            ? 'ring-2 ring-purple-600 shadow-lg'
            : 'ring-2 ring-red-600 shadow-lg')
      )}
    >
      <div
        className={cn(
          isStart
            ? 'text-purple-900 dark:text-purple-100'
            : 'text-red-900 dark:text-red-100'
        )}
      >
        {label}
      </div>

      {/* Start node only has output on the right */}
      {isStart ? (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-purple-500 border-2 border-white"
        />
      ) : (
        // End node only has input on the left
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-red-500 border-2 border-white"
        />
      )}
    </div>
  );
});

StartEndNode.displayName = 'StartEndNode';
