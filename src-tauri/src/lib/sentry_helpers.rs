//! Sentry helper functions and macros for consistent tracking.

/// Wrap a Tauri command body with automatic Sentry transaction tracking.
///
/// # Example
///
/// ```
/// use nexo_lib::track_command;
/// use std::io::Error;
///
/// fn main() {
///     let result: Result<i32, Error> = track_command!("my_command", {
///         Ok(42)
///     });
///     assert_eq!(result.unwrap(), 42);
/// }
/// ```
#[macro_export]
macro_rules! track_command {
    ($command_name:expr, $body:expr) => {{
        // Only track in production or when explicitly enabled
        if cfg!(not(debug_assertions)) || std::env::var("SENTRY_ENABLED").is_ok() {
            // Set transaction name
            sentry::configure_scope(|scope| {
                scope.set_transaction(Some($command_name));
            });

            // Start transaction
            let transaction = sentry::start_transaction(sentry::TransactionContext::new(
                $command_name,
                "tauri.command",
            ));

            // Execute body
            let result = $body;

            // Capture error if failed
            if let Err(ref e) = result {
                sentry::capture_error(e);
            }

            // Finish transaction
            transaction.finish();

            result
        } else {
            $body
        }
    }};
}

/// Track an operation with automatic timing and error reporting
#[macro_export]
macro_rules! track_operation {
    ($op_name:expr, $op_type:expr, $body:expr) => {{
        if cfg!(not(debug_assertions)) || std::env::var("SENTRY_ENABLED").is_ok() {
            let span =
                sentry::start_transaction(sentry::TransactionContext::new($op_name, $op_type));

            let result = $body;

            if let Err(ref e) = result {
                span.set_status(sentry::protocol::SpanStatus::InternalError);
                sentry::capture_error(e);
            } else {
                span.set_status(sentry::protocol::SpanStatus::Ok);
            }

            span.finish();
            result
        } else {
            $body
        }
    }};
}

/// Add breadcrumb with consistent formatting
pub fn add_breadcrumb(category: &str, message: String, level: sentry::Level) {
    if cfg!(not(debug_assertions)) || std::env::var("SENTRY_ENABLED").is_ok() {
        sentry::add_breadcrumb(sentry::Breadcrumb {
            ty: "default".into(),
            category: Some(category.into()),
            message: Some(message),
            level,
            ..Default::default()
        });
    }
}

/// Track LLM API call with provider and model context

/// Track MCP tool execution
pub fn track_tool_execution<T>(
    tool_name: &str,
    connection_id: &str,
    duration_ms: u64,
    result: &Result<T, Box<dyn std::error::Error>>,
) {
    if cfg!(not(debug_assertions)) || std::env::var("SENTRY_ENABLED").is_ok() {
        sentry::configure_scope(|scope| {
            scope.set_tag("tool.name", tool_name);
            scope.set_tag("tool.connection_id", connection_id);
            scope.set_extra("tool.duration_ms", duration_ms.into());
        });

        add_breadcrumb(
            "mcp.tool",
            format!(
                "Tool {} executed via {} - {}ms - {}",
                tool_name,
                connection_id,
                duration_ms,
                if result.is_ok() { "success" } else { "failed" }
            ),
            if result.is_ok() {
                sentry::Level::Info
            } else {
                sentry::Level::Error
            },
        );

        if let Err(e) = result {
            sentry::capture_message(&format!("Tool execution failed: {e}"), sentry::Level::Error);
        }
    }
}

/// Track chat message flow
#[allow(dead_code)]
pub fn track_chat_message(
    chat_id: &str,
    message_id: &str,
    message_type: &str, // "user" or "assistant"
    action: &str,       // "created", "streaming", "completed"
) {
    if cfg!(not(debug_assertions)) || std::env::var("SENTRY_ENABLED").is_ok() {
        add_breadcrumb(
            "chat.message",
            format!("Message {message_id} ({message_type}) - {action} - {chat_id}"),
            sentry::Level::Info,
        );
    }
}

/// Track workspace operations
pub fn track_workspace_operation(workspace_id: &str, operation: &str) {
    if cfg!(not(debug_assertions)) || std::env::var("SENTRY_ENABLED").is_ok() {
        sentry::configure_scope(|scope| {
            scope.set_tag("workspace.id", workspace_id);
            scope.set_tag("workspace.operation", operation);
        });

        add_breadcrumb(
            "workspace",
            format!("Workspace {workspace_id} - {operation}"),
            sentry::Level::Info,
        );
    }
}

/// Track database operations with timing
#[allow(dead_code)]
pub fn track_db_operation<T, E>(
    operation: &str,
    table: &str,
    duration_ms: u128,
    result: &Result<T, E>,
) where
    E: std::error::Error,
{
    if cfg!(not(debug_assertions)) || std::env::var("SENTRY_ENABLED").is_ok() {
        sentry::configure_scope(|scope| {
            scope.set_tag("db.operation", operation);
            scope.set_tag("db.table", table);
            scope.set_extra("db.duration_ms", (duration_ms as u64).into());
        });

        if duration_ms > 1000 {
            // Slow query warning
            add_breadcrumb(
                "db",
                format!("SLOW QUERY: {operation} on {table} took {duration_ms}ms"),
                sentry::Level::Warning,
            );
        }

        if let Err(e) = result {
            sentry::capture_message(
                &format!("DB operation {operation} on {table} failed: {e}"),
                sentry::Level::Error,
            );
        }
    }
}
