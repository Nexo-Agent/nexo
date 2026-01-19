export type PropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'unknown';

export function detectPropertyType(value: unknown): PropertyType {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'unknown';
}
