#[cfg(test)]
mod tests {
    use crate::constants::{TauriCommands, TauriEvents};

    #[test]
    fn generate_typescript_bindings() {
        // This test will trigger ts-rs to export TypeScript bindings
        // The bindings will be generated at compile time

        // Just verify constants are accessible
        assert_eq!(TauriCommands::GET_ADDON_CONFIG, "get_addon_config");
        assert_eq!(TauriEvents::MESSAGE_CHUNK, "message-chunk");
    }
}
