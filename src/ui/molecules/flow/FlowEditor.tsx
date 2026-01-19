import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

import { FlowCanvas } from './FlowCanvas';
import {
  type Node,
  type Connection,
  type OnSelectionChangeParams,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { Separator } from '@/ui/atoms/separator';
import { Switch } from '@/ui/atoms/switch';
import { Textarea } from '@/ui/atoms/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/atoms/select';
import { cn } from '@/lib/utils';

import type { FlowData } from '@/features/chat/types';

export interface FlowNodeType {
  type: string;
  label: string;
  description?: string;
  initialData?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
}

interface FlowEditorProps {
  initialFlow?: FlowData;
  availableNodes?: FlowNodeType[];
  onChange?: (flow: FlowData) => void;
  readOnly?: boolean;
  className?: string;
}

// --- Node Item Component ---
interface NodeItemProps {
  node: FlowNodeType;
  readOnly: boolean;
  onDoubleClick: () => void;
}

const NodeItem = ({ node, readOnly, onDoubleClick }: NodeItemProps) => {
  const { t } = useTranslation(['flow']);
  const label = t(`nodes.${node.type}`, { defaultValue: node.label });
  const description = t(`nodeDescriptions.${node.type}`, {
    defaultValue: node.description,
  });

  return (
    <div
      className={cn(
        'p-3 border rounded-md bg-card shadow-sm transition-all select-none flex flex-col gap-1',
        readOnly
          ? 'cursor-not-allowed opacity-70'
          : 'cursor-pointer hover:bg-accent hover:ring-1 hover:ring-primary/20 hover:border-primary/50'
      )}
      onDoubleClick={onDoubleClick}
    >
      <div className="text-sm font-semibold tracking-tight">{label}</div>
      {description && (
        <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
          {description}
        </div>
      )}
    </div>
  );
};

// --- Node Palette Component ---
interface NodePaletteProps {
  nodes: FlowNodeType[];
  readOnly: boolean;
  onNodeDoubleClick: (node: FlowNodeType) => void;
}

const NodePalette = ({
  nodes,
  readOnly,
  onNodeDoubleClick,
}: NodePaletteProps) => {
  const { t } = useTranslation(['flow']);

  return (
    <aside className="w-56 border-r bg-background flex flex-col h-full shrink-0">
      <div className="p-4 font-semibold border-b">{t('components')}</div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {nodes.map((node) => (
            <NodeItem
              key={node.type + node.label}
              node={node}
              readOnly={readOnly}
              onDoubleClick={() => {
                if (readOnly) return;
                onNodeDoubleClick(node);
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
};

// --- Helper: Detect property type ---
type PropertyType = 'string' | 'number' | 'boolean' | 'object' | 'unknown';

function detectPropertyType(value: unknown): PropertyType {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'unknown';
}

// --- Tags Field Component (separate to avoid conditional hook) ---
interface TagsFieldProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  readOnly: boolean;
}

const TagsField = ({ label, tags, onChange, readOnly }: TagsFieldProps) => {
  const { t } = useTranslation(['flow']);
  const [newTag, setNewTag] = useState('');

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {/* Display existing tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30">
            {tags.map((tag, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
              >
                <span>{tag}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onChange(tags.filter((_, i) => i !== index))}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new tag */}
        {!readOnly && (
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTag.trim()) {
                  onChange([...tags, newTag.trim()]);
                  setNewTag('');
                }
              }}
              placeholder={t('addTagPlaceholder')}
              className="h-8 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// --- Property Field Component ---
interface PropertyFieldProps {
  propertyKey: string;
  value: unknown;
  type: PropertyType;
  onChange: (key: string, value: unknown) => void;
  readOnly: boolean;
}

const PropertyField = ({
  propertyKey,
  value,
  type,
  onChange,
  readOnly,
}: PropertyFieldProps) => {
  const { t } = useTranslation(['flow', 'common']);

  // Try to translate the property key if it's a known one
  const translatedLabel = t(`propertyLabels.${propertyKey}`, {
    defaultValue: '',
  });

  const label =
    translatedLabel ||
    propertyKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

  // Special handling for 'backgroundColor' field
  if (propertyKey === 'backgroundColor') {
    return (
      <div className="space-y-2">
        <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
        <div className="flex gap-2">
          <Input
            id={`prop-${propertyKey}`}
            type="color"
            value={(value as string) || '#ffffff'}
            onChange={(e) => onChange(propertyKey, e.target.value)}
            disabled={readOnly}
            className="h-9 w-20 cursor-pointer"
          />
          <Input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(propertyKey, e.target.value)}
            disabled={readOnly}
            placeholder="#ffffff"
            className="flex-1 font-mono text-xs"
          />
        </div>
      </div>
    );
  }

  // Special handling for 'textColor' field
  if (propertyKey === 'textColor') {
    return (
      <div className="space-y-2">
        <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
        <div className="flex gap-2">
          <Input
            id={`prop-${propertyKey}`}
            type="color"
            value={(value as string) || '#000000'}
            onChange={(e) => onChange(propertyKey, e.target.value)}
            disabled={readOnly}
            className="h-9 w-20 cursor-pointer"
          />
          <Input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(propertyKey, e.target.value)}
            disabled={readOnly}
            placeholder="#000000"
            className="flex-1 font-mono text-xs"
          />
        </div>
      </div>
    );
  }

  // Special handling for 'borderColor' field
  if (propertyKey === 'borderColor') {
    return (
      <div className="space-y-2">
        <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
        <div className="flex gap-2">
          <Input
            id={`prop-${propertyKey}`}
            type="color"
            value={(value as string) || '#000000'}
            onChange={(e) => onChange(propertyKey, e.target.value)}
            disabled={readOnly}
            className="h-9 w-20 cursor-pointer"
          />
          <Input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(propertyKey, e.target.value)}
            disabled={readOnly}
            placeholder="#000000"
            className="flex-1 font-mono text-xs"
          />
        </div>
      </div>
    );
  }

  // Special handling for 'variant' field
  if (propertyKey === 'variant') {
    const variants = ['default', 'primary', 'danger', 'success', 'warning'];
    return (
      <div className="space-y-2">
        <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
        <Select
          value={(value as string) || 'default'}
          onValueChange={(newValue) => onChange(propertyKey, newValue)}
          disabled={readOnly}
        >
          <SelectTrigger id={`prop-${propertyKey}`} className="w-full">
            <SelectValue placeholder={t('selectVariant')} />
          </SelectTrigger>

          <SelectContent>
            {variants.map((variant) => (
              <SelectItem key={variant} value={variant}>
                <span className="capitalize">{variant}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Special handling for 'status' field
  if (propertyKey === 'status') {
    const statuses = ['idle', 'running', 'error', 'success'];
    return (
      <div className="space-y-2">
        <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
        <Select
          value={(value as string) || 'idle'}
          onValueChange={(newValue) => onChange(propertyKey, newValue)}
          disabled={readOnly}
        >
          <SelectTrigger id={`prop-${propertyKey}`} className="w-full">
            <SelectValue placeholder={t('selectStatus')} />
          </SelectTrigger>

          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                <span className="capitalize">{status}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Special handling for 'handlePosition' field
  if (propertyKey === 'handlePosition') {
    const positions = ['horizontal', 'vertical'];
    return (
      <div className="space-y-2">
        <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
        <Select
          value={(value as string) || 'horizontal'}
          onValueChange={(newValue) => onChange(propertyKey, newValue)}
          disabled={readOnly}
        >
          <SelectTrigger id={`prop-${propertyKey}`} className="w-full">
            <SelectValue placeholder={t('selectPosition')} />
          </SelectTrigger>

          <SelectContent>
            {positions.map((position) => (
              <SelectItem key={position} value={position}>
                <span className="capitalize">{position}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Special handling for 'handles' object
  if (propertyKey === 'handles' && type === 'object') {
    const handles = (value as Record<string, unknown>) || {};
    const handleKeys = ['target', 'source', 'targetLabel', 'sourceLabel'];

    return (
      <div className="space-y-3">
        <Label>{label}</Label>
        <div className="space-y-2 border rounded-md p-3 bg-muted/30">
          {handleKeys.map((key) => {
            const handleValue = handles[key];
            const isBooleanField = key === 'target' || key === 'source';

            if (isBooleanField) {
              return (
                <div
                  key={key}
                  className="flex items-center justify-between space-x-2"
                >
                  <Label
                    htmlFor={`handle-${key}`}
                    className="text-sm cursor-pointer capitalize"
                  >
                    {t(`propertyLabels.${key}`, { defaultValue: key })}
                  </Label>

                  <Switch
                    id={`handle-${key}`}
                    checked={(handleValue as boolean) ?? true}
                    onCheckedChange={(checked) =>
                      onChange(propertyKey, { ...handles, [key]: checked })
                    }
                    disabled={readOnly}
                  />
                </div>
              );
            } else {
              return (
                <div key={key} className="space-y-1">
                  <Label
                    htmlFor={`handle-${key}`}
                    className="text-xs capitalize"
                  >
                    {t(`propertyLabels.${key}`, { defaultValue: key })}
                  </Label>

                  <Input
                    id={`handle-${key}`}
                    value={(handleValue as string) || ''}
                    onChange={(e) =>
                      onChange(propertyKey, {
                        ...handles,
                        [key]: e.target.value,
                      })
                    }
                    disabled={readOnly}
                    placeholder={t('enterHandle', { key })}
                    className="h-8 text-xs"
                  />
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  }

  // Special handling for 'tags' array
  if (propertyKey === 'tags' && Array.isArray(value)) {
    return (
      <TagsField
        label={label}
        tags={value as string[]}
        onChange={(newTags) => onChange(propertyKey, newTags)}
        readOnly={readOnly}
      />
    );
  }

  // Special handling for 'opacity' field
  if (propertyKey === 'opacity') {
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor={`prop-${propertyKey}`}>{t('backgroundAlpha')}</Label>
          <span className="text-xs text-muted-foreground">
            {Math.round((value as number) * 100)}%
          </span>
        </div>
        <input
          id={`prop-${propertyKey}`}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={(value as number) || 1}
          onChange={(e) => onChange(propertyKey, parseFloat(e.target.value))}
          disabled={readOnly}
          className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>
    );
  }

  // Default handling based on type
  switch (type) {
    case 'string':
      return (
        <div className="space-y-2">
          <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
          <Input
            id={`prop-${propertyKey}`}
            value={(value as string) || ''}
            onChange={(e) => onChange(propertyKey, e.target.value)}
            disabled={readOnly}
            placeholder={label}
          />
        </div>
      );

    case 'number':
      return (
        <div className="space-y-2">
          <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
          <Input
            id={`prop-${propertyKey}`}
            type="number"
            value={(value as number) || 0}
            onChange={(e) => onChange(propertyKey, parseFloat(e.target.value))}
            disabled={readOnly}
            placeholder={label}
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor={`prop-${propertyKey}`} className="cursor-pointer">
            {label}
          </Label>
          <Switch
            id={`prop-${propertyKey}`}
            checked={value as boolean}
            onCheckedChange={(checked) => onChange(propertyKey, checked)}
            disabled={readOnly}
          />
        </div>
      );

    case 'object':
      return (
        <div className="space-y-2">
          <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
          <Textarea
            id={`prop-${propertyKey}`}
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(propertyKey, parsed);
              } catch {
                // Invalid JSON, ignore
              }
            }}
            disabled={readOnly}
            placeholder={label}
            className="font-mono text-xs"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">{t('editJsonTip')}</p>
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <div className="text-sm text-muted-foreground italic">
            Unsupported type: {typeof value}
          </div>
        </div>
      );
  }
};

// --- Right Sidebar: Property Panel ---
const PropertyPanel = ({
  selectedNode,
  onNodeUpdate,
  readOnly,
}: {
  selectedNode: Node | null;
  onNodeUpdate: (id: string, data: Record<string, unknown>) => void;
  readOnly: boolean;
}) => {
  const { t } = useTranslation(['flow']);

  if (!selectedNode) {
    return (
      <aside className="w-72 border-l bg-background flex flex-col h-full">
        <div className="p-4 font-semibold border-b">{t('properties')}</div>
        <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground text-sm">
          {t('selectNodePrompt')}
        </div>
      </aside>
    );
  }

  const handleChange = (key: string, value: unknown) => {
    onNodeUpdate(selectedNode.id, {
      ...selectedNode.data,
      [key]: value,
    });
  };

  // Extract all properties from node.data, excluding undefined and null
  const properties = Object.entries(selectedNode.data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({
      key,
      value,
      type: detectPropertyType(value),
    }));

  return (
    <aside className="w-72 border-l bg-background flex flex-col h-full">
      <div className="p-4 font-semibold border-b">{t('properties')}</div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Node Type - Read Only */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('type')}</Label>
            <div className="font-medium capitalize">
              {t(`nodes.${selectedNode.type}`, {
                defaultValue: selectedNode.type,
              })}
            </div>
          </div>

          <Separator />

          {/* Dynamic Properties */}
          {properties.length > 0 ? (
            properties.map(({ key, value, type }) => (
              <PropertyField
                key={key}
                propertyKey={key}
                value={value}
                type={type}
                onChange={handleChange}
                readOnly={readOnly}
              />
            ))
          ) : (
            <div className="text-sm text-muted-foreground italic">
              {t('noProperties')}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

// Internal component that uses ReactFlow hooks
function FlowEditorInner({
  initialFlow,
  availableNodes = [],
  onChange,
  readOnly = false,
  className,
}: FlowEditorProps) {
  const { t } = useTranslation(['flow']);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlow?.nodes || []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialFlow?.edges || []
  );
  const { setViewport, screenToFlowPosition, toObject } = useReactFlow();

  // Track selected node for the property panel
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const defaultNodeTypes: FlowNodeType[] = useMemo(
    () => [
      {
        type: 'simple',
        label: t('nodes.simple'),
        initialData: { label: t('nodes.simple') },
      },
    ],
    [t]
  );

  const nodeLibrary =
    availableNodes.length > 0 ? availableNodes : defaultNodeTypes;

  // Handler to add a node at the center of the viewport
  const handleAddNodeAtCenter = useCallback(
    (nodeTemplate: FlowNodeType) => {
      if (readOnly) return;

      try {
        // Calculate the center position in flow coordinates
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const position = screenToFlowPosition({
          x: centerX,
          y: centerY,
        });

        const newNode: Node = {
          id: `node-${Date.now()}`,
          type: nodeTemplate.type,
          position,
          zIndex: nodeTemplate.type === 'group' ? 0 : 10,
          data: {
            ...nodeTemplate.initialData,
            label: nodeTemplate.initialData?.label || nodeTemplate.label,
            ...(nodeTemplate.className && {
              className: nodeTemplate.className,
            }),
            ...(nodeTemplate.style && { style: nodeTemplate.style }),
          },
          ...(nodeTemplate.type === 'group' && {
            style: { width: 400, height: 200, ...nodeTemplate.style },
          }),
        };

        setNodes((nds) =>
          nodeTemplate.type === 'group'
            ? [newNode, ...nds]
            : nds.concat(newNode)
        );
      } catch (err) {
        logger.error('Failed to add node at center:', err);
      }
    },
    [readOnly, screenToFlowPosition, setNodes]
  );

  // Restore viewport if provided
  useEffect(() => {
    if (initialFlow?.viewport) {
      const { x, y, zoom } = initialFlow.viewport;
      setViewport({ x, y, zoom }, { duration: 300 });
    }
  }, [initialFlow?.viewport, setViewport]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange && !readOnly) {
      const flowData = toObject();
      onChange(flowData);
    }
  }, [nodes, edges, onChange, readOnly, toObject]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      if (selectedNodes.length > 0) {
        setSelectedNodeId(selectedNodes[0].id);
      } else {
        setSelectedNodeId(null);
      }
    },
    []
  );

  const handleNodeUpdate = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: { ...node.data, ...data },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  return (
    <div
      className={cn(
        'flex w-full h-full bg-background overflow-hidden relative',
        className
      )}
    >
      {/* 1. Left Sidebar: Nodes */}
      <NodePalette
        nodes={nodeLibrary}
        readOnly={readOnly}
        onNodeDoubleClick={handleAddNodeAtCenter}
      />

      {/* 2. Main Area: Flow Canvas */}
      <div className="flex-1 min-w-0 bg-background relative h-full">
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onSelectionChange={handleSelectionChange}
          readOnly={readOnly}
          fitView={true}
          showBackground={true}
        />
      </div>

      {/* 3. Right Sidebar: Properties */}
      <PropertyPanel
        selectedNode={selectedNode}
        onNodeUpdate={handleNodeUpdate}
        readOnly={readOnly}
      />
    </div>
  );
}

// Main component that wraps with ReactFlowProvider
export function FlowEditor(props: FlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  );
}
