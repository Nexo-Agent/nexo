use crate::constants::TauriEvents;
use crate::error::AppError;
use crate::events::AgentLoopIterationEvent;
use tauri::{AppHandle, Emitter};

pub struct AgentEmitter {
    app: AppHandle,
}

impl AgentEmitter {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }

    pub fn emit_agent_loop_iteration(
        &self,
        chat_id: String,
        iteration: usize,
        max_iterations: usize,
        has_tool_calls: bool,
    ) -> Result<(), AppError> {
        self.app
            .emit(
                TauriEvents::AGENT_LOOP_ITERATION,
                AgentLoopIterationEvent {
                    chat_id,
                    iteration,
                    max_iterations,
                    has_tool_calls,
                },
            )
            .map_err(|e| {
                AppError::Generic(format!("Failed to emit agent-loop-iteration event: {e}"))
            })
    }
}
