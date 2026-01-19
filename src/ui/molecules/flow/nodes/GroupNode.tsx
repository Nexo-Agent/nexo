import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { NodePropertyProps } from './types';
import { PropertyField } from './components/NodePropertyFields';
import { GroupNode as AtomGroupNode } from '@/ui/atoms/xyflow/labeled-group-node';

export interface GroupNodeData {
  label?: string;
}

const GroupNodeComponent = memo(({ data, selected }: NodeProps) => {
  return (
    <AtomGroupNode
      label={data.label as string}
      selected={selected}
      className="h-full w-full"
    />
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
  </div>
);
GroupNodeProperty.displayName = 'GroupNode.Property';

export const GroupNode = Object.assign(GroupNodeComponent, {
  Property: GroupNodeProperty,
});
