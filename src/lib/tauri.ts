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
