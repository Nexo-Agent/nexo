use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

// State to manage persistent MCP client connections
// Store clients as boxed trait objects to handle different transport types
pub struct MCPClientState {
    // We'll store connection info and recreate clients as needed
    // This is simpler than trying to store different client types
    #[allow(clippy::type_complexity)]
    pub connection_info:
        Arc<Mutex<HashMap<String, (String, String, Option<String>, Option<String>)>>>,
}

impl MCPClientState {
    pub fn new() -> Self {
        Self {
            connection_info: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for MCPClientState {
    fn default() -> Self {
        Self::new()
    }
}
