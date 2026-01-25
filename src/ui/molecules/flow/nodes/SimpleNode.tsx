import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { BaseNode, BaseNodeContent } from '@/ui/atoms/xyflow/base-node';
import { BaseHandle } from '@/ui/atoms/xyflow/base-handle';
import { NodeResizer } from '@/ui/atoms/xyflow/node-resizer';
import { cn } from '@/lib/utils';
import type { NodePropertyProps } from './types';
import { PropertyField } from './components/NodePropertyFields';

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

const SimpleNodeComponent = memo(({ data, selected }: NodeProps) => {
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
    <>
      <NodeResizer isVisible={selected} minWidth={100} minHeight={40} />
      <BaseNode
        className={cn(
          'min-w-[100px] h-full transition-[transform,background-color,color,box-shadow,border-color] duration-200',
          selected && 'scale-[1.02]'
        )}
        style={{
          backgroundColor: backgroundColor || undefined,
          color: textColor || undefined,
        }}
      >
        <BaseNodeContent className="text-center h-full flex items-center justify-center">
          {label}
        </BaseNodeContent>

        {/* Handles */}
        {handles.target && (
          <BaseHandle type="target" position={targetPosition} />
        )}

        {handles.source && (
          <BaseHandle type="source" position={sourcePosition} />
        )}
      </BaseNode>
    </>
  );
});
SimpleNodeComponent.displayName = 'SimpleNode';

const SimpleNodeProperty = ({
  data,
  onChange,
  readOnly,
}: NodePropertyProps<SimpleNodeData>) => {
  return (
    <div className="space-y-4">
      <PropertyField
        propertyKey="label"
        value={data.label}
        type="string"
        onChange={(key, val) =>
          onChange({ [key]: val } as Partial<SimpleNodeData>)
        }
        readOnly={readOnly}
      />
      <PropertyField
        propertyKey="backgroundColor"
        value={data.backgroundColor}
        type="string"
        onChange={(key, val) =>
          onChange({ [key]: val } as Partial<SimpleNodeData>)
        }
        readOnly={readOnly}
      />
      <PropertyField
        propertyKey="textColor"
        value={data.textColor}
        type="string"
        onChange={(key, val) =>
          onChange({ [key]: val } as Partial<SimpleNodeData>)
        }
        readOnly={readOnly}
      />
      <PropertyField
        propertyKey="handlePosition"
        value={data.handlePosition}
        type="string"
        onChange={(key, val) =>
          onChange({ [key]: val } as Partial<SimpleNodeData>)
        }
        readOnly={readOnly}
      />
      <PropertyField
        propertyKey="handles"
        value={data.handles}
        type="object"
        onChange={(key, val) =>
          onChange({ [key]: val } as Partial<SimpleNodeData>)
        }
        readOnly={!!readOnly}
      />
    </div>
  );
};
SimpleNodeProperty.displayName = 'SimpleNode.Property';

export const SimpleNode = Object.assign(SimpleNodeComponent, {
  Property: SimpleNodeProperty,
});
