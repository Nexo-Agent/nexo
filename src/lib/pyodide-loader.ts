import type { PyodideInterface } from 'pyodide';

interface PyodideExtended extends PyodideInterface {
  loadPackage: (packages: string | string[]) => Promise<void>;
}

interface PyodideLoaderState {
  pyodide: PyodideInterface | null;
  isLoading: boolean;
  error: string | null;
  loadPromise: Promise<PyodideInterface> | null;
}

// Global state to cache Pyodide instance
let pyodideState: PyodideLoaderState = {
  pyodide: null,
  isLoading: false,
  error: null,
  loadPromise: null,
};

/**
 * Load Pyodide with caching mechanism.
 * If Pyodide is already loaded, returns the cached instance immediately.
 * If Pyodide is currently loading, waits for the existing load to complete.
 * If Pyodide hasn't been loaded yet, starts loading it.
 */
export async function loadPyodide(): Promise<PyodideInterface> {
  // If already loaded, return immediately
  if (pyodideState.pyodide) {
    return pyodideState.pyodide;
  }

  // If currently loading, wait for the existing load promise
  if (pyodideState.loadPromise) {
    return pyodideState.loadPromise;
  }

  // Start loading Pyodide
  pyodideState.isLoading = true;
  pyodideState.error = null;

  const loadPromise = (async () => {
    try {
      // Dynamically import pyodide
      const pyodideModule = await import('pyodide');
      const pyodide = (await pyodideModule.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/',
      })) as PyodideExtended;

      const builtinPackages = ['numpy', 'scipy', 'matplotlib'];
      await pyodide.loadPackage(builtinPackages);

      // Packages that need to be installed via micropip
      await pyodide.loadPackage('micropip');
      await pyodide.runPythonAsync(`
        import micropip
        await micropip.install("scikit-learn")
      `);

      // Cache the loaded instance
      pyodideState.pyodide = pyodide;
      pyodideState.isLoading = false;
      pyodideState.loadPromise = null;

      return pyodide;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      pyodideState.error = error.message;
      pyodideState.isLoading = false;
      pyodideState.loadPromise = null;

      throw error;
    }
  })();

  pyodideState.loadPromise = loadPromise;
  return loadPromise;
}

/**
 * Get the current Pyodide state (for UI components to check loading status)
 */
export function getPyodideState(): {
  pyodide: PyodideInterface | null;
  isLoading: boolean;
  error: string | null;
} {
  return {
    pyodide: pyodideState.pyodide,
    isLoading: pyodideState.isLoading,
    error: pyodideState.error,
  };
}

/**
 * Reset the Pyodide loader (useful for testing or error recovery)
 */
export function resetPyodideLoader(): void {
  pyodideState = {
    pyodide: null,
    isLoading: false,
    error: null,
    loadPromise: null,
  };
}
