use crate::models::addon_config::{AddonIndex, REMOTE_INDEX_URL};
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime};

/// Service to fetch and cache index configuration from remote
/// Manages addon versions, notifications, app updates, etc
pub struct IndexConfigService {
    cached_config: Arc<RwLock<Option<CachedConfig>>>,
}

struct CachedConfig {
    config: AddonIndex,
    fetched_at: SystemTime,
}

impl IndexConfigService {
    pub fn new() -> Self {
        Self {
            cached_config: Arc::new(RwLock::new(None)),
        }
    }

    /// Get addon config (from cache or fetch from remote)
    pub async fn get_config(&self) -> AddonIndex {
        // Check cache first
        if let Some(cached) = self.get_from_cache() {
            return cached;
        }

        // Fetch from remote
        match self.fetch_remote_config().await {
            Ok(config) => {
                self.update_cache(config.clone());
                config
            }
            Err(e) => {
                eprintln!("Failed to fetch index config: {}, using default", e);
                AddonIndex::default()
            }
        }
    }

    fn get_from_cache(&self) -> Option<AddonIndex> {
        let cache = self.cached_config.read().ok()?;
        let cached = cache.as_ref()?;

        // Cache valid for 1 hour
        if cached.fetched_at.elapsed().ok()? < Duration::from_secs(3600) {
            Some(cached.config.clone())
        } else {
            None
        }
    }

    fn update_cache(&self, config: AddonIndex) {
        if let Ok(mut cache) = self.cached_config.write() {
            *cache = Some(CachedConfig {
                config,
                fetched_at: SystemTime::now(),
            });
        }
    }

    async fn fetch_remote_config(&self) -> Result<AddonIndex, String> {
        let response = reqwest::get(REMOTE_INDEX_URL)
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("HTTP {} error", response.status()));
        }

        let yaml_text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        serde_yaml::from_str(&yaml_text).map_err(|e| format!("Failed to parse YAML: {}", e))
    }

    /// Force refresh config from remote
    pub async fn refresh_config(&self) -> Result<AddonIndex, String> {
        let config = self.fetch_remote_config().await?;
        self.update_cache(config.clone());
        Ok(config)
    }
}

impl Default for IndexConfigService {
    fn default() -> Self {
        Self::new()
    }
}
