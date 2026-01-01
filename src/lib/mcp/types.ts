/**
 * MCP-specific types
 */

export interface MCPToolType {
  name: string;
  description?: string;
  inputSchema?: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description?: string;
        enum?: string[];
        // ... other JSON Schema properties
      }
    >;
    required?: string[];
  };
}

export interface MCPServerConnection {
  id: string;
  name: string;
  url: string;
  type: 'sse' | 'stdio' | 'http-streamable';
  headers?: string;
  runtime_path?: string;
  status?: 'disconnected' | 'connecting' | 'connected';
  tools?: MCPToolType[];
  errorMessage?: string;
}
