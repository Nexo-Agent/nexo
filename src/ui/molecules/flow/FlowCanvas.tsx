import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnSelectionChangeParams,
  type ColorMode,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';

import { useTheme } from '@/hooks/use-theme';
import { nodeTypes } from './nodes';

export interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  onConnect?: OnConnect;
  onSelectionChange?: (params: OnSelectionChangeParams) => void;
  readOnly?: boolean;
  fitView?: boolean;
  showControls?: boolean;
  showMiniMap?: boolean;
  showBackground?: boolean;
  className?: string;
  colorMode?: ColorMode;
  children?: React.ReactNode;
  zoomOnScroll?: boolean;
  panOnScroll?: boolean;
  panOnDrag?: boolean;
  zoomOnDoubleClick?: boolean;
  onNodeDragStop?: (event: React.MouseEvent, node: Node, nodes: Node[]) => void;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  readOnly = false,
  fitView = true,
  showControls = true,
  showMiniMap = true,
  showBackground = true,
  className,
  colorMode,
  children,
  zoomOnScroll,
  panOnScroll,
  panOnDrag,
  zoomOnDoubleClick,
  onNodeDragStop,
}: FlowCanvasProps) {
  const { theme } = useTheme();
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const actualTheme =
    theme === 'system' ? systemTheme : theme === 'dark' ? 'dark' : 'light';

  const effectiveColorMode = colorMode ?? theme;

  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      onSelectionChange?.(params);
    },
    [onSelectionChange]
  );

  return (
    <div className={cn('w-full h-full relative bg-background', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onSelectionChange={handleSelectionChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView={fitView}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly || !!onSelectionChange}
        zoomOnScroll={zoomOnScroll ?? !readOnly}
        panOnScroll={panOnScroll ?? !readOnly}
        panOnDrag={panOnDrag ?? !readOnly}
        zoomOnDoubleClick={zoomOnDoubleClick ?? !readOnly}
        elevateNodesOnSelect={false}
        colorMode={effectiveColorMode}
        proOptions={{ hideAttribution: true }}
        style={{ width: '100%', height: '100%' }}
      >
        {showBackground && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color={actualTheme === 'dark' ? '#ffffff' : '#000000'}
            className="opacity-[0.15]"
          />
        )}
        {showControls && !readOnly && <Controls />}
        {showMiniMap && !readOnly && <MiniMap />}
        {children}
      </ReactFlow>
    </div>
  );
}
