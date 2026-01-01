// @ts-nocheck
import { Suspense, useContext } from 'react';
import { lazy } from 'react';
import { StreamdownContext } from './context';
import { CodeBlockCopyButton } from './code-block/copy-button';
import { CodeBlockSkeleton } from './code-block/skeleton';
import { MermaidDownloadDropdown } from './mermaid/download-button';
import { MermaidFullscreenButton } from './mermaid/fullscreen-button';
import { cn } from './utils';
import { shouldShowControls, shouldShowMermaidControl } from './control-utils';

const Mermaid = lazy(() =>
  import('./mermaid').then((mod) => ({ default: mod.Mermaid }))
);

interface MermaidComponentProps {
  code: string;
  className?: string;
}

export const MermaidComponent = ({
  code,
  className,
}: MermaidComponentProps) => {
  const { mermaid: mermaidContext, controls: controlsConfig } =
    useContext(StreamdownContext);

  const showMermaidControls = shouldShowControls(controlsConfig, 'mermaid');
  const showDownload = shouldShowMermaidControl(controlsConfig, 'download');
  const showCopy = shouldShowMermaidControl(controlsConfig, 'copy');
  const showFullscreen = shouldShowMermaidControl(controlsConfig, 'fullscreen');
  const showPanZoomControls = shouldShowMermaidControl(
    controlsConfig,
    'panZoom'
  );

  const shouldShowMermaidControls =
    showMermaidControls && (showDownload || showCopy || showFullscreen);

  return (
    <Suspense fallback={<CodeBlockSkeleton />}>
      <div
        className={cn(
          'group relative my-4 h-auto rounded-xl border p-4',
          className
        )}
        data-streamdown="mermaid-block"
      >
        {shouldShowMermaidControls ? (
          <div className="flex items-center justify-end gap-2">
            {showDownload ? (
              <MermaidDownloadDropdown
                chart={code}
                config={mermaidContext?.config}
              />
            ) : null}
            {showCopy ? <CodeBlockCopyButton code={code} /> : null}
            {showFullscreen ? (
              <MermaidFullscreenButton
                chart={code}
                config={mermaidContext?.config}
              />
            ) : null}
          </div>
        ) : null}
        <Mermaid
          chart={code}
          config={mermaidContext?.config}
          showControls={showPanZoomControls}
        />
      </div>
    </Suspense>
  );
};
