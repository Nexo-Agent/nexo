use crate::models::AddonIndex;
use crate::services::IndexConfigService;
use tauri::{command, State};

#[command]
pub async fn get_addon_config(
    config_service: State<'_, IndexConfigService>,
) -> Result<AddonIndex, String> {
    Ok(config_service.get_config().await)
}

#[command]
pub async fn refresh_addon_config(
    config_service: State<'_, IndexConfigService>,
) -> Result<AddonIndex, String> {
    config_service.refresh_config().await
}
