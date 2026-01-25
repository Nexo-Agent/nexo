import { Maximize2Icon } from 'lucide-react';
import type { MermaidConfig } from 'mermaid';
import { type ComponentProps, useContext, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/ui/atoms/dialog';
import { StreamdownContext } from '../context';
import { cn } from '../utils';
import { Mermaid } from '.';

type MermaidFullscreenButtonProps = ComponentProps<'button'> & {
  chart: string;
  config?: MermaidConfig;
  onFullscreen?: () => void;
  onExit?: () => void;
};

export const MermaidFullscreenButton = ({
  chart,
  config,
  onFullscreen,
  onExit,
  className,
  ...props
}: MermaidFullscreenButtonProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isAnimating, controls: controlsConfig } =
    useContext(StreamdownContext);
  const showPanZoomControls = (() => {
    if (typeof controlsConfig === 'boolean') {
      return controlsConfig;
    }
    const mermaidCtl = controlsConfig.mermaid;
    if (mermaidCtl === false) {
      return false;
    }
    if (mermaidCtl === true || mermaidCtl === undefined) {
      return true;
    }
    return mermaidCtl.panZoom !== false;
  })();

  const handleToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle callbacks separately to avoid scroll lock flickering
  useEffect(() => {
    if (isFullscreen) {
      onFullscreen?.();
    } else if (onExit) {
      onExit();
    }
  }, [isFullscreen, onFullscreen, onExit]);

  return (
    <>
      <button
        className={cn(
          'cursor-pointer p-1 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        disabled={isAnimating}
        onClick={handleToggle}
        title="View fullscreen"
        type="button"
        {...props}
      >
        <Maximize2Icon size={14} />
      </button>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-none! w-[98vw] max-h-[95vh] h-[95vh] p-0 border-none bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center">
          <DialogTitle className="sr-only">Mermaid Chart Fullscreen</DialogTitle>
          <DialogDescription className="sr-only">
            Viewing mermaid chart in fullscreen mode
          </DialogDescription>
          <div className="flex-1 w-full h-full flex items-center justify-center p-4 min-h-0">
            <Mermaid
              chart={chart}
              className="size-full"
              config={config}
              fullscreen={true}
              showControls={showPanZoomControls}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
