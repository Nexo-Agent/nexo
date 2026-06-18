/**
 * Type-safe Tauri invocation helpers
 * Single source of truth for command and event names
 */

import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';
import { TauriCommand } from '@/bindings/commands';
import { TauriEvent } from '@/bindings/events';

/**
 * Type-safe wrapper for Tauri invoke
 * @param command Command name from TauriCommands
 * @param args Optional arguments object
 * @returns Promise with the result
 */
export async function invokeCommand<T = void>(
  command: TauriCommand,
  args?: Record<string, unknown>
): Promise<T> {
  return tauriInvoke(command, args);
}

/**
 * Type-safe wrapper for Tauri event listener
 * @param event Event name from TauriEvents
 * @param handler Event handler function
 * @returns Promise with unlisten function
 */
export async function listenToEvent<T = unknown>(
  event: TauriEvent,
  handler: (payload: T) => void
) {
  return tauriListen(event, (ev) => handler(ev.payload as T));
}

// Re-export for convenience
export { TauriCommands } from '@/bindings/commands';
export { TauriEvents } from '@/bindings/events';

import { AppDispatch } from '@/app/store';
import { showError } from '@/features/notifications/state/notificationSlice';
import { parseBackendError } from '@/lib/utils';

/**
 * Standardized error handler for Tauri command failures.
 * Parses the backend error format [Category] Message and dispatches a notification.
 */
export function handleCommandError(dispatch: AppDispatch, error: unknown) {
  const { category, message } = parseBackendError(error);
  dispatch(showError(message, undefined, undefined, category));
}
