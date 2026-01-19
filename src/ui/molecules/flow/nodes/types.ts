export interface NodePropertyProps<T = Record<string, unknown>> {
  data: T;
  onChange: (newData: Partial<T>) => void;
  readOnly?: boolean;
}
