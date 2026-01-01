use crate::error::AppError;
use crate::repositories::MCPConnectionRepository;
use crate::services::MCPClientService;
use std::sync::Arc;
use std::time::Duration;

pub struct MCPToolRefreshService {
    app: tauri::AppHandle,
    mcp_connection_repository: Arc<dyn MCPConnectionRepository>,
}

impl MCPToolRefreshService {
    pub fn new(
        app: tauri::AppHandle,
        mcp_connection_repository: Arc<dyn MCPConnectionRepository>,
    ) -> Self {
        Self {
            app,
            mcp_connection_repository,
        }
    }

    /// Start background job to refresh MCP tools every 5 minutes
    pub fn start_background_refresh(self: Arc<Self>) {
        tauri::async_runtime::spawn(async move {
            // Initial delay of 10 seconds after app startup
            tauri::async_runtime::spawn(async {
                tokio::time::sleep(Duration::from_secs(10)).await;
            })
            .await
            .ok();

            // Initial refresh
            if let Err(e) = self.refresh_all_tools().await {
                eprintln!("Initial MCP tools refresh failed: {}", e);
            }

            // Then refresh every 5 minutes
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 minutes
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            loop {
                interval.tick().await;
                if let Err(e) = self.refresh_all_tools().await {
                    eprintln!("MCP tools refresh failed: {}", e);
                }
            }
        });
    }

    /// Refresh tools for all connected MCP servers
    async fn refresh_all_tools(&self) -> Result<(), AppError> {
        // Get all MCP connections
        let connections = self.mcp_connection_repository.get_all()?;

        for connection in connections {
            // Only refresh connected servers
            if connection.status != "connected" {
                continue;
            }

            // Fetch tools from MCP server
            match MCPClientService::test_connection_and_fetch_tools(
                &self.app,
                connection.url.clone(),
                connection.r#type.clone(),
                if connection.headers.is_empty() {
                    None
                } else {
                    Some(connection.headers.clone())
                },
                connection.runtime_path.clone(),
            )
            .await
            {
                Ok(tools) => {
                    // Serialize tools to JSON
                    let tools_json = serde_json::to_string(&tools).map_err(|e| {
                        AppError::Generic(format!("Failed to serialize tools: {}", e))
                    })?;

                    // Update connection with new tools
                    self.mcp_connection_repository.update_status(
                        &connection.id,
                        "connected",
                        Some(&tools_json),
                        None,
                    )?;
                }
                Err(e) => {
                    // Log error but don't fail the entire refresh
                    eprintln!(
                        "Failed to refresh tools for connection {} ({}): {}",
                        connection.id, connection.name, e
                    );

                    // Optionally update status to indicate refresh failure
                    // but keep the connection as "connected" with old tools
                }
            }
        }

        Ok(())
    }
}
