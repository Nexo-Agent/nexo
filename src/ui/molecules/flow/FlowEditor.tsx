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
import { Label } from '@/ui/atoms/label';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { Separator } from '@/ui/atoms/separator';
import { cn } from '@/lib/utils';

import type { FlowData } from '@/features/chat/types';

import { nodeTypes } from './nodes';

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
        'p-3 border rounded-md bg-card shadow-sm transition-[background-color,ring,border-color,box-shadow,opacity] select-none flex flex-col gap-1',
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

// --- Property Panel Component ---
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

  const handleChange = (dataUpdates: Record<string, unknown>) => {
    onNodeUpdate(selectedNode.id, {
      ...selectedNode.data,
      ...dataUpdates,
    });
  };

  // Get the property component from the node type
  const nodeTypeKey = selectedNode.type as keyof typeof nodeTypes;
  const PropertyComponent = (nodeTypes[nodeTypeKey] as any)?.Property;

  return (
    <aside className="w-72 border-l bg-background flex flex-col h-full">
      <div className="p-4 font-semibold border-b">{t('properties')}</div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Node Type - Read Only */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('type')}</Label>
            <div className="font-medium capitalize text-sm">
              {t(`nodes.${selectedNode.type}`, {
                defaultValue: selectedNode.type,
              })}
            </div>
          </div>

          <Separator />

          {/* Dynamic Properties */}
          {PropertyComponent ? (
            <PropertyComponent
              data={selectedNode.data}
              onChange={handleChange}
              readOnly={readOnly}
            />
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

        const isGroup =
          nodeTemplate.type === 'group' ||
          nodeTemplate.type === 'labeledGroupNode';

        const newNode: Node = {
          id: `node-${Date.now()}`,
          type: nodeTemplate.type,
          position,
          zIndex: isGroup ? 0 : 10,
          data: {
            ...nodeTemplate.initialData,
            label: nodeTemplate.initialData?.label || nodeTemplate.label,
            ...(nodeTemplate.className && {
              className: nodeTemplate.className,
            }),
            ...(nodeTemplate.style && { style: nodeTemplate.style }),
          },
          ...(isGroup && {
            style: { width: 400, height: 200, ...nodeTemplate.style },
          }),
        };

        setNodes((nds) => (isGroup ? [newNode, ...nds] : nds.concat(newNode)));
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

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (readOnly) return;

      // Calculate absolute position of the dragging node
      const parentNode = node.parentId
        ? nodes.find((p) => p.id === node.parentId)
        : null;
      const absX =
        node.parentId && parentNode
          ? node.position.x + parentNode.position.x
          : node.position.x;
      const absY =
        node.parentId && parentNode
          ? node.position.y + parentNode.position.y
          : node.position.y;

      const droppedOver = nodes.find((n) => {
        if (
          n.id === node.id ||
          (n.type !== 'group' && n.type !== 'labeledGroupNode')
        )
          return false;

        const nWidth = n.width ?? n.measured?.width ?? 0;
        const nHeight = n.height ?? n.measured?.height ?? 0;

        return (
          absX >= n.position.x &&
          absY >= n.position.y &&
          absX <= n.position.x + nWidth &&
          absY <= n.position.y + nHeight
        );
      });

      if (droppedOver && node.parentId !== droppedOver.id) {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              return {
                ...n,
                parentId: droppedOver.id,
                extent: undefined, // Allow dragging out
                position: {
                  x: absX - droppedOver.position.x,
                  y: absY - droppedOver.position.y,
                },
              } as Node;
            }
            return n;
          })
        );
      } else if (!droppedOver && node.parentId) {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              return {
                ...n,
                parentId: undefined,
                extent: undefined,
                position: {
                  x: absX,
                  y: absY,
                },
              } as Node;
            }
            return n;
          })
        );
      }
    },
    [nodes, setNodes, readOnly]
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
          onNodeDragStop={onNodeDragStop}
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
