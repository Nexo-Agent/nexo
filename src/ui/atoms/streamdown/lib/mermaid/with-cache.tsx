import { type ComponentType, useEffect, useState } from 'react';
import type { MermaidProps } from './index';
import { getCachePath, getChartHash } from './utils';

export function withMermaidCache<P extends MermaidProps>(
  Component: ComponentType<P>
) {
  return function WithMermaidCache(props: P) {
    const [cachedSvg, setCachedSvg] = useState<string | undefined>(undefined);
    const [cachePath, setCachePath] = useState<string | undefined>(undefined);
    const chartHash = getChartHash(props.chart);

    useEffect(() => {
      let isMounted = true;

      const checkCache = async () => {
        try {
          const fullPath = await getCachePath(chartHash);
          if (!isMounted) return;
          
          const { readTextFile, exists } = await import('@tauri-apps/plugin-fs');
          const fileExists = await exists(fullPath);

          if (fileExists) {
            const content = await readTextFile(fullPath);
            if (isMounted) {
              setCachedSvg(content);
              setCachePath(fullPath);
            }
          } else {
            if (isMounted) setCachePath(fullPath);
          }
        } catch (error) {
          console.error('[MermaidCache] checkCache error:', error);
        }
      };

      checkCache();
      return () => { isMounted = false; };
    }, [chartHash]);

    const handleRender = async (svg: string) => {
      try {
        // Fix race condition: calculate path if not yet set in state
        const targetPath = cachePath || await getCachePath(chartHash);
        
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(targetPath, svg);
        
        // If we just saved it, update the state so data-cache-path appears immediately
        if (!cachePath) setCachePath(targetPath);
        
      } catch (error) {
        console.error('[MermaidCache] handleRender error:', error);
      }
    };

    // While loading cache, we can either show nothing or pass through a "loading" state
    // But since Mermaid component handles its own loading, we just pass what we have
    return (
      <Component
        {...props}
        cachedSvg={cachedSvg}
        cachePath={cachePath}
        onRender={(svg: string) => {
          props.onRender?.(svg);
          handleRender(svg);
        }}
      />
    );
  };
}
