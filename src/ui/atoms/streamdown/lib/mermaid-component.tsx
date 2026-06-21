// @ts-nocheck
import { Suspense, useContext } from 'react';
import { lazy } from 'react';
import { StreamdownContext } from './context';
import { CodeBlockSkeleton } from './code-block/skeleton';
import { PreviewCodeBlock } from './code-block/preview-code-block';
import { MermaidDownloadDropdown } from './mermaid/download-button';
import { MermaidFullscreenButton } from './mermaid/fullscreen-button';
import { cn } from './utils';
import { shouldShowControls, shouldShowMermaidControl } from './control-utils';

const Mermaid = lazy(() =>
 import('./mermaid').then((mod) => ({ default: mod.CachedMermaid }))
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
 const showFullscreen = shouldShowMermaidControl(controlsConfig, 'fullscreen');
 const showPanZoomControls = shouldShowMermaidControl(
 controlsConfig,
 'panZoom'
 );

 const previewHeaderActions =
 showMermaidControls && (showDownload || showFullscreen) ? (
 <>
 {showDownload ? (
 <MermaidDownloadDropdown
 chart={code}
 config={mermaidContext?.config}
 />
 ) : null}
 {showFullscreen ? (
 <MermaidFullscreenButton
 chart={code}
 config={mermaidContext?.config}
 />
 ) : null}
 </>
 ) : null;

 return (
 <Suspense fallback={<CodeBlockSkeleton />}>
 <div className={cn('my-1', className)} data-streamdown="mermaid-block">
 <PreviewCodeBlock
 code={code}
 language="mermaid"
 defaultView="preview"
 previewAvailable
 previewHeaderActions={previewHeaderActions}
 preview={
 <div className="p-2">
 <Mermaid
 chart={code}
 config={mermaidContext?.config}
 showControls={showPanZoomControls}
 />
 </div>
 }
 />
 </div>
 </Suspense>
 );
};
