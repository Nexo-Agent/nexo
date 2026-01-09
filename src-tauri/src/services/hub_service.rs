use crate::error::AppError;
use crate::models::{HubIndex, HubPrompt};
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime};

const HUB_INDEX_URL: &str =
    "https://raw.githubusercontent.com/Nexo-Agent/official-hub/main/index.json";

/// Service to fetch and cache hub index configuration from remote
/// Manages prompt templates, agents, and MCP servers from the official hub
pub struct HubService {
    cached_index: Arc<RwLock<Option<CachedIndex>>>,
}

struct CachedIndex {
    index: HubIndex,
    fetched_at: SystemTime,
}

impl HubService {
    pub fn new() -> Self {
        Self {
            cached_index: Arc::new(RwLock::new(None)),
        }
    }

    /// Get hub index (from cache or fetch from remote)
    pub async fn get_index(&self) -> Result<HubIndex, AppError> {
        // Check cache first
        if let Some(cached) = self.get_from_cache() {
            return Ok(cached);
        }

        // Fetch from remote
        match self.fetch_remote_index().await {
            Ok(index) => {
                self.update_cache(index.clone());
                Ok(index)
            }
            Err(e) => Err(AppError::Hub(format!("Failed to fetch hub index: {}", e))),
        }
    }

    /// Get only prompts from hub index
    pub async fn get_prompts(&self) -> Result<Vec<HubPrompt>, AppError> {
        let index = self.get_index().await?;
        Ok(index.resources.prompts)
    }

    fn get_from_cache(&self) -> Option<HubIndex> {
        let cache = self.cached_index.read().ok()?;
        let cached = cache.as_ref()?;

        // Cache valid for 1 hour
        if cached.fetched_at.elapsed().ok()? < Duration::from_secs(3600) {
            Some(cached.index.clone())
        } else {
            None
        }
    }

    fn update_cache(&self, index: HubIndex) {
        if let Ok(mut cache) = self.cached_index.write() {
            *cache = Some(CachedIndex {
                index,
                fetched_at: SystemTime::now(),
            });
        }
    }

    async fn fetch_remote_index(&self) -> Result<HubIndex, String> {
        let response = reqwest::get(HUB_INDEX_URL)
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("HTTP {} error", response.status()));
        }

        let json_text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        serde_json::from_str(&json_text)
            .map_err(|e| format!("Failed to parse JSON: {}", e))
    }

    /// Force refresh index from remote
    #[allow(dead_code)]
    pub async fn refresh_index(&self) -> Result<HubIndex, AppError> {
        let index = self.fetch_remote_index().await.map_err(|e| {
            AppError::Hub(format!("Failed to refresh hub index: {}", e))
        })?;
        self.update_cache(index.clone());
        Ok(index)
    }
}

impl Default for HubService {
    fn default() -> Self {
        Self::new()
    }
}
