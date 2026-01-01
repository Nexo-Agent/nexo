declare module 'pyodide' {
  export interface PyodideInterface {
    runPython(code: string): unknown;
    runPythonAsync(code: string): Promise<unknown>;
    setStdout(options: { batched: (text: string) => void }): void;
    setStderr(options: { batched: (text: string) => void }): void;
  }

  export function loadPyodide(options: {
    indexURL: string;
  }): Promise<PyodideInterface>;
}
