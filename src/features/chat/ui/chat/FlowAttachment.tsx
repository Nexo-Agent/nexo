import { FlowCanvas } from '@/ui/molecules/flow/FlowCanvas';
import { ReactFlowProvider } from '@xyflow/react';
import { Workflow, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowData } from '@/features/chat/types';

interface FlowAttachmentProps {
  flow: FlowData;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
  mode?: 'chatinput' | 'message';
}

function FlowAttachmentInner({
  flow,
  onClick,
  onRemove,
  className,
  mode = 'chatinput',
}: FlowAttachmentProps) {
  const nodeCount = flow.nodes?.length || 0;
  const edgeCount = flow.edges?.length || 0;

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border overflow-hidden',
        mode === 'chatinput' ? 'w-64 h-40' : 'w-80 h-48',
        className
      )}
    >
      {/* Flow Preview */}
      <div
        className={cn(
          'w-full h-full cursor-pointer transition-opacity',
          onClick && 'hover:opacity-80'
        )}
        onClick={onClick}
      >
        {nodeCount > 0 ? (
          <FlowCanvas
            nodes={flow.nodes || []}
            edges={flow.edges || []}
            readOnly={true}
            fitView={true}
            showControls={false}
            showMiniMap={false}
            zoomOnScroll={false}
            panOnScroll={false}
            panOnDrag={false}
            zoomOnDoubleClick={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground">
            <Workflow className="size-8 mb-2 opacity-50" />
            <span className="text-xs">Empty Workflow</span>
          </div>
        )}
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm px-2 py-1.5 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Workflow className="size-3" />
            <span className="font-medium">
              {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
            </span>
            {edgeCount > 0 && (
              <>
                <span>•</span>
                <span>
                  {edgeCount} {edgeCount === 1 ? 'connection' : 'connections'}
                </span>
              </>
            )}
          </div>

          {/* Remove button for chatinput mode */}
          {mode === 'chatinput' && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="rounded-full p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remove workflow"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FlowAttachment(props: FlowAttachmentProps) {
  return (
    <ReactFlowProvider>
      <FlowAttachmentInner {...props} />
    </ReactFlowProvider>
  );
}
