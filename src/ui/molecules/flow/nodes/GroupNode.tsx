import { memo } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { cn } from '@/lib/utils';

export interface GroupNodeData {
  label?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  opacity?: number;
}

export const GroupNode = memo(({ data, selected }: NodeProps) => {
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
        // Opacity now only affects the background via CSS variable or direct opacity if needed,
        // but here we can use a wrapper or just apply it to the bg color if it's rgba.
        // To make it simple and effective, we'll use an overlay or just apply opacity to the whole div
        // but keep the children opaque? No, it's better to just use the opacity prop on the div
        // for background only OR use rgba for backgroundColor.
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

GroupNode.displayName = 'GroupNode';
