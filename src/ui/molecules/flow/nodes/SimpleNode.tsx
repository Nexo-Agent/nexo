import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';

import { BaseNode, BaseNodeContent } from '@/ui/atoms/xyflow/base-node';
import { BaseHandle } from '@/ui/atoms/xyflow/base-handle';
import { cn } from '@/lib/utils';

// Định nghĩa các kiểu dữ liệu cho SimpleNode (tối giản)
export interface SimpleNodeData {
  label?: string;
  backgroundColor?: string;
  textColor?: string;
  handlePosition?: 'horizontal' | 'vertical';
  handles?: {
    target?: boolean;
    source?: boolean;
  };
}

export const SimpleNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as SimpleNodeData;
  const {
    label = 'Node',
    backgroundColor,
    textColor,
    handlePosition = 'horizontal',
    handles = { target: true, source: true },
  } = nodeData;

  // Xác định vị trí handle
  const targetPosition =
    handlePosition === 'horizontal' ? Position.Left : Position.Top;
  const sourcePosition =
    handlePosition === 'horizontal' ? Position.Right : Position.Bottom;

  return (
    <BaseNode
      className={cn(
        'min-w-[100px] max-w-[180px] transition-all duration-200',
        selected && 'scale-[1.02]'
      )}
      style={{
        backgroundColor: backgroundColor || undefined,
        color: textColor || undefined,
      }}
    >
      <BaseNodeContent className="text-center">{label}</BaseNodeContent>

      {/* Handles */}
      {handles.target && <BaseHandle type="target" position={targetPosition} />}

      {handles.source && <BaseHandle type="source" position={sourcePosition} />}
    </BaseNode>
  );
});

SimpleNode.displayName = 'SimpleNode';
