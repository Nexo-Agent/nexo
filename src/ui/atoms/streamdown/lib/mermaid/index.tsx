// @ts-nocheck
import type { MermaidConfig } from 'mermaid';
import { useContext, useEffect, useState } from 'react';
import { useDeferredRender } from '../../hooks/use-deferred-render';
import { StreamdownContext } from '../context';
import { cn } from '../utils';
import { PanZoom } from './pan-zoom';
import { getChartHash, initializeMermaid } from './utils';
import { withMermaidCache } from './with-cache';

export type MermaidProps = {
  chart: string;
  className?: string;
  config?: MermaidConfig;
  fullscreen?: boolean;
  showControls?: boolean;
  cachedSvg?: string;
  cachePath?: string;
  onRender?: (svg: string) => void;
};

export const Mermaid = ({
  chart,
  className,
  config,
  fullscreen = false,
  showControls = true,
  cachedSvg,
  cachePath,
  onRender,
}: MermaidProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [svgContent, setSvgContent] = useState<string>(cachedSvg || '');
  const [lastValidSvg, setLastValidSvg] = useState<string>(cachedSvg || '');
  const [retryCount, setRetryCount] = useState(0);
  const { mermaid: mermaidContext } = useContext(StreamdownContext);
  const ErrorComponent = mermaidContext?.errorComponent;

  // Use deferred render hook for optimal performance
  const { shouldRender, containerRef } = useDeferredRender({
    immediate: fullscreen,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: "Required for Mermaid"
  useEffect(() => {
    // Only render when shouldRender is true and we don't have cached content
    if (!shouldRender || cachedSvg) {
      if (cachedSvg && cachedSvg !== svgContent) {
        setSvgContent(cachedSvg);
        setLastValidSvg(cachedSvg);
      }
      return;
    }

    const renderChart = async () => {
      try {
        setError(null);
        setIsLoading(true);

        // Initialize mermaid with optional custom config
        const mermaid = await initializeMermaid(config);

        // Use a stable ID based on chart content hash and timestamp to ensure uniqueness
        const chartHash = getChartHash(chart);
        const uniqueId = `mermaid-${chartHash}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const { svg } = await mermaid.render(uniqueId, chart);

        // Update both current and last valid SVG
        setSvgContent(svg);
        setLastValidSvg(svg);

        // Call onRender callback if provided
        onRender?.(svg);
      } catch (err) {
        // Silently fail and keep the last valid SVG
        // Don't update svgContent here - just keep what we have

        // Only set error if we don't have any valid SVG
        if (!(lastValidSvg || svgContent)) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Failed to render Mermaid chart';
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    renderChart();
  }, [chart, config, retryCount, shouldRender]);

  // Always render the SVG if we have content (either current, last valid, or cached)
  const displaySvg = cachedSvg || svgContent || lastValidSvg;

  // Show placeholder when not scheduled to render
  if (!(shouldRender || displaySvg)) {
    return (
      <div
        className={cn('my-4 min-h-[200px]', className)}
        data-cache-path={cachePath}
        ref={containerRef}
      />
    );
  }

  if (isLoading && !displaySvg) {
    return (
      <div
        className={cn('my-4 flex justify-center p-4', className)}
        data-cache-path={cachePath}
        ref={containerRef}
      >
        <div className="flex items-center space-x-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-current border-b-2" />
          <span className="text-sm">Loading diagram...</span>
        </div>
      </div>
    );
  }

  // Only show error if we have no valid SVG to display
  if (error && !displaySvg) {
    const retry = () => setRetryCount((count) => count + 1);

    // Use custom error component if provided
    if (ErrorComponent) {
      return (
        <div ref={containerRef} data-cache-path={cachePath}>
          <ErrorComponent chart={chart} error={error} retry={retry} />
        </div>
      );
    }

    // Default error display
    return (
      <div
        className={cn(
          'rounded-lg border border-error/20 bg-error/5 p-4',
          className
        )}
        data-cache-path={cachePath}
        ref={containerRef}
      >
        <p className="font-mono text-error text-sm">Mermaid Error: {error}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-error/80 text-xs">
            Show Code
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-error/10 p-2 text-error/90 text-xs text-muted-foreground/90">
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div
      className="size-full"
      data-cache-path={cachePath}
      ref={containerRef}
    >
      <PanZoom
        className={cn(
          fullscreen ? 'size-full overflow-hidden' : 'my-4 overflow-hidden',
          className
        )}
        fullscreen={fullscreen}
        maxZoom={3}
        minZoom={0.5}
        showControls={showControls}
        zoomStep={0.1}
      >
        <div
          aria-label="Mermaid chart"
          className={cn(
            'flex justify-center',
            fullscreen ? 'size-full items-center' : null
          )}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required for Mermaid"
          dangerouslySetInnerHTML={{ __html: displaySvg }}
          role="img"
        />
      </PanZoom>
    </div>
  );
};

export const CachedMermaid = withMermaidCache(Mermaid);
