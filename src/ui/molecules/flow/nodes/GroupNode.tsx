import { memo } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { NodePropertyProps } from './types';
import { PropertyField } from './components/NodePropertyFields';

export interface GroupNodeData {
  label?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  opacity?: number;
}

const GroupNodeComponent = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as GroupNodeData;
  const {
    label = 'Group',
    backgroundColor = 'rgba(240, 240, 240, 0.2)',
    textColor = 'var(--foreground)',
    borderColor = 'var(--border)',
    opacity = 1,
  } = nodeData;

  return (
    <div
      className={cn(
        'relative h-full w-full rounded-md border transition-all duration-200 pointer-events-none',
        selected
          ? 'border-primary ring-2 ring-primary/10'
          : 'border-muted-foreground/20'
      )}
      style={{
        borderColor: selected ? undefined : borderColor,
      }}
    >
      {/* Background layer with opacity */}
      <div
        className="absolute inset-0 rounded-md -z-10"
        style={{ backgroundColor, opacity }}
      />
      {/* Chỉ phần Resizer và tiêu đề mới bắt sự kiện (pointer-events-auto) */}
      <div className="absolute inset-0 pointer-events-none">
        <NodeResizer
          color="var(--primary)"
          isVisible={selected}
          minWidth={100}
          minHeight={100}
          handleStyle={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            pointerEvents: 'auto',
          }}
          lineStyle={{ pointerEvents: 'auto' }}
        />
      </div>

      <div
        className="absolute -top-5 left-1 px-1.5 text-[10px] uppercase tracking-wider font-bold opacity-70 select-none pointer-events-auto cursor-default"
        style={{ color: textColor }}
      >
        {label}
      </div>
    </div>
  );
});
GroupNodeComponent.displayName = 'GroupNode';

const GroupNodeProperty = ({
  data,
  onChange,
  readOnly,
}: NodePropertyProps<GroupNodeData>) => (
  <div className="space-y-4">
    <PropertyField
      propertyKey="label"
      value={data.label}
      type="string"
      onChange={(key, val) =>
        onChange({ [key]: val } as Partial<GroupNodeData>)
      }
      readOnly={readOnly}
    />
    <PropertyField
      propertyKey="backgroundColor"
      value={data.backgroundColor}
      type="string"
      onChange={(key, val) =>
        onChange({ [key]: val } as Partial<GroupNodeData>)
      }
      readOnly={readOnly}
    />
    <PropertyField
      propertyKey="textColor"
      value={data.textColor}
      type="string"
      onChange={(key, val) =>
        onChange({ [key]: val } as Partial<GroupNodeData>)
      }
      readOnly={readOnly}
    />
    <PropertyField
      propertyKey="borderColor"
      value={data.borderColor}
      type="string"
      onChange={(key, val) =>
        onChange({ [key]: val } as Partial<GroupNodeData>)
      }
      readOnly={!!readOnly}
    />
    <PropertyField
      propertyKey="opacity"
      value={data.opacity}
      type="number"
      onChange={(key, val) =>
        onChange({ [key]: val } as Partial<GroupNodeData>)
      }
      readOnly={!!readOnly}
    />
  </div>
);
GroupNodeProperty.displayName = 'GroupNode.Property';

export const GroupNode = Object.assign(GroupNodeComponent, {
  Property: GroupNodeProperty,
});
