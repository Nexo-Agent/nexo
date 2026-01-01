// @ts-nocheck
export const shouldShowControls = (
  config:
    | boolean
    | {
        table?: boolean;
        code?:
          | boolean
          | {
              download?: boolean;
              copy?: boolean;
              execute?: boolean;
            };
        mermaid?:
          | boolean
          | { download?: boolean; copy?: boolean; fullscreen?: boolean };
      },
  type: 'table' | 'code' | 'mermaid'
) => {
  if (typeof config === 'boolean') {
    return config;
  }

  return config[type];
};

export const shouldShowMermaidControl = (
  config:
    | boolean
    | {
        table?: boolean;
        code?:
          | boolean
          | {
              download?: boolean;
              copy?: boolean;
              execute?: boolean;
            };
        mermaid?:
          | boolean
          | {
              download?: boolean;
              copy?: boolean;
              fullscreen?: boolean;
              panZoom?: boolean;
            };
      },
  controlType: 'download' | 'copy' | 'fullscreen' | 'panZoom'
): boolean => {
  if (typeof config === 'boolean') {
    return config;
  }

  const mermaidConfig = config.mermaid;

  if (mermaidConfig === false) {
    return false;
  }

  if (mermaidConfig === true || mermaidConfig === undefined) {
    return true;
  }

  return mermaidConfig[controlType] !== false;
};
