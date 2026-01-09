export interface PythonRuntimeStatus {
  version: string;
  installed: boolean;
  path: string | null;
}

export interface NodeRuntimeStatus {
  version: string;
  installed: boolean;
  path: string | null;
}

export interface AddonConfig {
  addons: {
    python: {
      versions: string[];
      uv: {
        version: string;
      };
    };
    nodejs: {
      versions: string[];
    };
  };
}
