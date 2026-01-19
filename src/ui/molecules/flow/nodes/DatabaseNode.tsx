import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { LabeledHandle } from '@/ui/atoms/xyflow/labeled-handle';
import { BaseNodeHeader } from '@/ui/atoms/xyflow/base-node';
import {
  DatabaseSchemaNode,
  DatabaseSchemaNodeBody,
  DatabaseSchemaTableRow,
  DatabaseSchemaTableCell,
} from '@/ui/atoms/xyflow/database-schema-node';
import type { NodePropertyProps } from './types';
import { PropertyField, SchemaField } from './components/NodePropertyFields';

export interface DatabaseField {
  title: string;
  type: string;
}

export interface DatabaseNodeData {
  label: string;
  schema: DatabaseField[];
}

const DatabaseNodeComponent = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as DatabaseNodeData;
  const { label = 'Table Name', schema = [] } = nodeData;

  return (
    <DatabaseSchemaNode className="p-0 border-border/50 shadow-sm select-none">
      <BaseNodeHeader className="rounded-tl-md rounded-tr-md bg-muted/5 px-4 py-3 text-left border-b border-border/50">
        <span className="text-sm font-medium text-muted-foreground/80 tracking-tight">
          {label}
        </span>
      </BaseNodeHeader>
      <DatabaseSchemaNodeBody>
        {schema.map((entry, index) => (
          <DatabaseSchemaTableRow
            key={`${entry.title}-${index}`}
            className="border-b border-border/20 last:border-0 hover:bg-muted/5 transition-colors"
          >
            <DatabaseSchemaTableCell className="pl-0 pr-6 py-0">
              <LabeledHandle
                id={`${entry.title}-target`}
                title={entry.title}
                type="target"
                position={Position.Left}
                handleClassName="bg-background! border-slate-300! dark:border-slate-600! w-2.5 h-2.5 transform"
                labelClassName="text-xs font-normal pl-4 text-foreground/90 py-2"
              />
            </DatabaseSchemaTableCell>
            <DatabaseSchemaTableCell className="pr-0 py-0">
              <LabeledHandle
                id={`${entry.title}-source`}
                title={entry.type}
                type="source"
                position={Position.Right}
                className="p-0"
                handleClassName="bg-background! border-slate-300! dark:border-slate-600! w-2.5 h-2.5 transform "
                labelClassName="p-0 w-full pr-4 text-right text-[10px] text-muted-foreground/50 font-light py-2"
              />
            </DatabaseSchemaTableCell>
          </DatabaseSchemaTableRow>
        ))}
      </DatabaseSchemaNodeBody>
    </DatabaseSchemaNode>
  );
});
DatabaseNodeComponent.displayName = 'DatabaseNode';

const DatabaseNodeProperty = ({
  data,
  onChange,
  readOnly,
}: NodePropertyProps<DatabaseNodeData>) => {
  return (
    <div className="space-y-4">
      <PropertyField
        propertyKey="label"
        value={data.label}
        type="string"
        onChange={(key, val) =>
          onChange({ [key]: val } as Partial<DatabaseNodeData>)
        }
        readOnly={readOnly}
      />
      <SchemaField
        label="Schema"
        schema={data.schema}
        onChange={(newSchema) => onChange({ schema: newSchema })}
        readOnly={readOnly}
      />
    </div>
  );
};
DatabaseNodeProperty.displayName = 'DatabaseNode.Property';

export const DatabaseNode = Object.assign(DatabaseNodeComponent, {
  Property: DatabaseNodeProperty,
});
