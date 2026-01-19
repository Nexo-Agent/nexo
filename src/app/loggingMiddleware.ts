import { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { logger } from '@/lib/logger';

/**
 * Type guard to check if action has a type property
 */
function isAction(action: unknown): action is UnknownAction {
  return (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    typeof (action as { type: unknown }).type === 'string'
  );
}

export const loggingMiddleware: Middleware =
  (_store) => (next) => (action: unknown) => {
    const startTime = performance.now();

    const result = next(action);

    const duration = performance.now() - startTime;
    if (isAction(action) && duration > 300) {
      logger.warn('Slow Redux action', {
        action: action.type,
        duration,
      });
    }

    return result;
  };
