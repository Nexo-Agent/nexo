/** Usage stats store Unix time in milliseconds. */
export function toEpochMs(timestamp: number): number {
  return timestamp > 1e12 ? timestamp : timestamp * 1000;
}
