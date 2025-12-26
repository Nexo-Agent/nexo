import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { LLMConnection, LLMModel } from "@/components/settings/LLMConnections";
import type { MCPServerConnection } from "@/components/settings/MCPServerConnections";
import {
  getLLMConnections as getLLMConnectionsFromDb,
  getMCPServerConnections as getMCPServerConnectionsFromDb,
  type LLMConnection as DbLLMConnection,
  type MCPServerConnection as DbMCPServerConnection,
} from "@/lib/db-api";

export type { LLMModel };

interface ConnectionsContextType {
  llmConnections: LLMConnection[];
  mcpConnections: MCPServerConnection[];
  setLLMConnections: (connections: LLMConnection[]) => void;
  setMCPConnections: (connections: MCPServerConnection[]) => void;
  refreshConnections: () => Promise<void>;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(
  undefined
);

// Convert database LLMConnection to frontend LLMConnection
function dbToFrontendLLMConnection(
  dbConn: DbLLMConnection
): LLMConnection {
  let models: LLMModel[] | undefined;
  if (dbConn.models_json) {
    try {
      models = JSON.parse(dbConn.models_json);
    } catch (e) {
      console.error("Error parsing models_json:", e);
      models = undefined;
    }
  }

  return {
    id: dbConn.id,
    name: dbConn.name,
    baseUrl: dbConn.base_url,
    provider: dbConn.provider,
    apiKey: dbConn.api_key,
    models,
  };
}

// Convert database MCPServerConnection to frontend MCPServerConnection
function dbToFrontendMCPServerConnection(
  dbConn: DbMCPServerConnection
): MCPServerConnection {
  return {
    id: dbConn.id,
    name: dbConn.name,
    url: dbConn.url,
    type: dbConn.type as "sse" | "stdio" | "http-streamable",
    headers: dbConn.headers || undefined,
  };
}

export function ConnectionsProvider({ children }: { children: ReactNode }) {
  const [llmConnections, setLLMConnectionsState] = useState<LLMConnection[]>([]);
  const [mcpConnections, setMCPConnectionsState] = useState<MCPServerConnection[]>([]);

  const loadConnections = async () => {
    try {
      // Load LLM connections
      const dbLLMConnections = await getLLMConnectionsFromDb();
      const frontendLLMConnections = dbLLMConnections.map(
        dbToFrontendLLMConnection
      );
      setLLMConnectionsState(frontendLLMConnections);

      // Load MCP connections
      const dbMCPConnections = await getMCPServerConnectionsFromDb();
      const frontendMCPConnections = dbMCPConnections.map(
        dbToFrontendMCPServerConnection
      );
      setMCPConnectionsState(frontendMCPConnections);
    } catch (error) {
      console.error("Error loading connections:", error);
      // Set empty arrays on error
      setLLMConnectionsState([]);
      setMCPConnectionsState([]);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const setLLMConnections = (connections: LLMConnection[]) => {
    setLLMConnectionsState(connections);
  };

  const setMCPConnections = (connections: MCPServerConnection[]) => {
    setMCPConnectionsState(connections);
  };

  const refreshConnections = async () => {
    await loadConnections();
  };

  return (
    <ConnectionsContext.Provider
      value={{
        llmConnections,
        mcpConnections,
        setLLMConnections,
        setMCPConnections,
        refreshConnections,
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

