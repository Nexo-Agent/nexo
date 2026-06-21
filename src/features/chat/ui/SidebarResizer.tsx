import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/atoms/tooltip';

const DRAG_THRESHOLD_PX = 4;

function sidebarCollapseShortcutLabel(): string {
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('mac');
  return isMac ? '⌘\\' : 'Ctrl+\\';
}

interface SidebarResizerProps {
  isResizing: boolean;
  style?: React.CSSProperties;
  onResizeStart: (e: React.MouseEvent) => void;
  onResizeEnd: (didDrag: boolean) => void;
}

export function SidebarResizer({
  isResizing,
  style,
  onResizeStart,
  onResizeEnd,
}: SidebarResizerProps) {
  const { t } = useTranslation('common');
  const dragStartXRef = useRef(0);
  const didDragRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragStartXRef.current = e.clientX;
      didDragRef.current = false;
      onResizeStart(e);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (
          Math.abs(moveEvent.clientX - dragStartXRef.current) >=
          DRAG_THRESHOLD_PX
        ) {
          didDragRef.current = true;
        }
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        onResizeEnd(didDragRef.current);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [onResizeEnd, onResizeStart]
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t('sidebarResizerDrag')}
          style={style}
          onMouseDown={handleMouseDown}
          className={cn(
            'group/resizer absolute top-0 bottom-0 z-50 flex w-2 -translate-x-1/2 cursor-col-resize items-center justify-center',
            isResizing && 'cursor-col-resize'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'h-7 w-1 rounded-full bg-muted-foreground/50 transition-opacity duration-150',
              isResizing
                ? 'opacity-100'
                : 'opacity-0 group-hover/resizer:opacity-100'
            )}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={6}
        className="border-0 bg-foreground px-2.5 py-2 text-background shadow-md [&>svg]:hidden"
      >
        <div className="flex flex-col gap-0.5 text-xs leading-snug">
          <span>
            {t('sidebarResizerCollapse', {
              shortcut: sidebarCollapseShortcutLabel(),
            })}
          </span>
          <span className="text-background/65">{t('sidebarResizerDrag')}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
