import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { visualizer } from 'rollup-plugin-visualizer';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Sentry plugin for uploading source maps (only in production builds)
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_FRONTEND || 'nexo-frontend',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !hasSentryAuthToken,
      // Only upload source maps in production builds
      sourcemaps: {
        disable: process.env.NODE_ENV !== 'production' || !hasSentryAuthToken,
      },
      release: {
        create: hasSentryAuthToken,
        finalize: hasSentryAuthToken,
        setCommits: hasSentryAuthToken ? { auto: true } : false,
      },
      telemetry: false,
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayIframe: true,
        excludeReplayShadowDom: true,
        excludeReplayWorker: true,
      },
    }),
    mode === 'analyze' &&
      visualizer({
        filename: 'dist/bundle-stats.html',
        title: 'Nexo Frontend Bundle Analysis',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
        open: false,
        projectRoot: __dirname,
      }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Generate source maps for Sentry
    sourcemap: true,
  },
}));
