use super::client::MCPClientService;
use crate::error::AppError;
use crate::features::mcp_connection::MCPConnectionRepository;
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
            tauri::async_runtime::spawn(async {
                tokio::time::sleep(Duration::from_secs(10)).await;
            })
            .await
            .ok();

            if let Err(e) = self.refresh_all_tools().await {
                tracing::error!("Initial MCP tools refresh failed: {e}");
            }

            let mut interval = tokio::time::interval(Duration::from_secs(300));
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            loop {
                interval.tick().await;
                if let Err(e) = self.refresh_all_tools().await {
                    tracing::error!("MCP tools refresh failed: {e}");
                }
            }
        });
    }

    async fn refresh_all_tools(&self) -> Result<(), AppError> {
        let connections = self.mcp_connection_repository.get_all()?;

        for connection in connections {
            if connection.status != "connected" {
                continue;
            }

            match MCPClientService::test_connection_and_fetch_tools(
                &self.app,
                connection.url.clone(),
                connection.r#type.clone(),
                if connection.headers.is_empty() {
                    None
                } else {
                    Some(connection.headers.clone())
                },
                connection.env_vars.clone(),
                connection.runtime_path.clone(),
            )
            .await
            {
                Ok(tools) => {
                    let tools_json = serde_json::to_string(&tools).map_err(|e| {
                        AppError::Generic(format!("Failed to serialize tools: {e}"))
                    })?;

                    self.mcp_connection_repository.update_status(
                        &connection.id,
                        "connected",
                        Some(&tools_json),
                        None,
                    )?;
                }
                Err(e) => {
                    tracing::error!(
                        "Failed to refresh tools for connection {} ({}): {}",
                        connection.id,
                        connection.name,
                        e
                    );
                }
            }
        }

        Ok(())
    }
}
