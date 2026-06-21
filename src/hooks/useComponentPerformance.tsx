/**
 * Hook to track component render performance with Sentry
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import * as Sentry from '@sentry/react';

interface UseComponentPerformanceOptions {
  componentName: string;
  threshold?: number; // Only track if render time exceeds this (ms)
}

/**
 * Hook to automatically track component render performance
 *
 * Usage:
 * ```tsx
 * function MyComponent(props) {
 * useComponentPerformance({ componentName: 'MyComponent', threshold: 100 });
 * // ... component logic
 * }
 * ```
 */
export function useComponentPerformance({
  componentName,
  threshold = 100,
}: UseComponentPerformanceOptions) {
  const renderStartTime = useRef<number | null>(null);
  const renderCount = useRef<number>(0);

  // Mark render start time (runs synchronously after render)
  useLayoutEffect(() => {
    renderStartTime.current = performance.now();
  });

  // Measure and track render performance (runs after paint)
  useEffect(() => {
    if (renderStartTime.current === null) {
      return;
    }

    const renderTime = performance.now() - renderStartTime.current;
    renderCount.current += 1;

    // Only track slow renders
    if (renderTime > threshold) {
      Sentry.addBreadcrumb({
        category: 'ui.performance',
        message: `Slow render: ${componentName}`,
        level: 'warning',
        data: {
          componentName,
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCount.current,
        },
      });

      // Capture as event for very slow renders
      if (renderTime > 500) {
        Sentry.captureMessage(`Very slow render: ${componentName}`, {
          level: 'warning',
          extra: {
            renderTime,
            renderCount: renderCount.current,
          },
        });
      }
    }

    // Reset timer for next render
    renderStartTime.current = null;
  });
}

/**
 * HOC to wrap a component with performance tracking
 *
 * Usage:
 * ```tsx
 * const TrackedComponent = withPerformanceTracking(MyComponent, {
 * componentName: 'MyComponent',
 * threshold: 100,
 * });
 * ```
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  options: UseComponentPerformanceOptions
) {
  return function PerformanceTrackedComponent(props: P) {
    useComponentPerformance(options);
    return <Component {...props} />;
  };
}
