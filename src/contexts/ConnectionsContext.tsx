import React, { createContext, useContext, useState, ReactNode } from "react";
import type { LLMConnection, LLMModel } from "@/components/settings/LLMConnections";
import type { MCPServerConnection } from "@/components/settings/MCPServerConnections";

export type { LLMModel };

interface ConnectionsContextType {
  llmConnections: LLMConnection[];
  mcpConnections: MCPServerConnection[];
  setLLMConnections: (connections: LLMConnection[]) => void;
  setMCPConnections: (connections: MCPServerConnection[]) => void;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(
  undefined
);

export function ConnectionsProvider({ children }: { children: ReactNode }) {
  const [llmConnections, setLLMConnections] = useState<LLMConnection[]>([
    {
      id: "1",
      name: "OpenAI Default",
      baseUrl: "https://api.openai.com/v1",
      provider: "openai",
      apiKey: "",
    },
  ]);
  const [mcpConnections, setMCPConnections] = useState<MCPServerConnection[]>([
    {
      id: "1",
      name: "MCP Server 1",
      url: "http://localhost:3000/mcp",
      type: "sse",
      headers: '{"Authorization": "Bearer token"}',
    },
  ]);

  return (
    <ConnectionsContext.Provider
      value={{
        llmConnections,
        mcpConnections,
        setLLMConnections,
        setMCPConnections,
      }}
    >
      {children}
    </ConnectionsContext.Provider>
  );
}

export function useConnections() {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    throw new Error("useConnections must be used within a ConnectionsProvider");
  }
  return context;
}

