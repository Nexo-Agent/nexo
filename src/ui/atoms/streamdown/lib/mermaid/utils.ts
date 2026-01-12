// @ts-nocheck
import type { MermaidConfig } from 'mermaid';

export const initializeMermaid = async (customConfig?: MermaidConfig) => {
  const defaultConfig: MermaidConfig = {
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',
    fontFamily: 'monospace',
    suppressErrorRendering: true,
  } as MermaidConfig;

  const config = { ...defaultConfig, ...customConfig };

  const mermaidModule = await import('mermaid');
  const mermaid = mermaidModule.default;

  // Always reinitialize with the current config to support different configs per component
  mermaid.initialize(config);

  return mermaid;
};

export const svgToPngBlob = (
  svgString: string,
  options?: { scale?: number }
): Promise<Blob> => {
  const scale = options?.scale ?? 5;

  return new Promise((resolve, reject) => {
    const encoded =
      'data:image/svg+xml;base64,' +
      btoa(unescape(encodeURIComponent(svgString)));

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.width * scale;
      const h = img.height * scale;

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to create 2D canvas context for PNG export'));
        return;
      }

      // Do NOT draw a background → transparency preserved
      // ctx.clearRect(0, 0, w, h);

      ctx.drawImage(img, 0, 0, w, h);

      // Export PNG (lossless, keeps transparency)
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create PNG blob'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    };

    img.onerror = () => reject(new Error('Failed to load SVG image'));
    img.src = encoded;
  });
};

export const getChartHash = (chart: string): string => {
  let hash = 0;
  for (let i = 0; i < chart.length; i++) {
    const char = chart.charCodeAt(i);
    // biome-ignore lint/suspicious/noBitwiseOperators: "Required for hashing"
    hash = (hash << 5) - hash + char;
    // biome-ignore lint/suspicious/noBitwiseOperators: "Required for hashing"
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

export const getCachePath = async (hash: string): Promise<string> => {
  try {
    const { join, appDataDir } = await import('@tauri-apps/api/path');
    const { mkdir, exists } = await import('@tauri-apps/plugin-fs');
    
    const cacheDir = await appDataDir();
    const mermaidCacheDir = await join(cacheDir, 'mermaid_cache');

    const dirExists = await exists(mermaidCacheDir);
    if (!dirExists) {
      await mkdir(mermaidCacheDir, { recursive: true });
    }

    return await join(mermaidCacheDir, `${hash}.svg`);
  } catch (err) {
    console.error('[MermaidCache] Utils Error:', err);
    throw err;
  }
};
