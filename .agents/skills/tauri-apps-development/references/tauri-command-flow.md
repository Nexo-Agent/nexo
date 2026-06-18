---
description: How a Tauri v2 command travels from Rust to the frontend, and the recommended single-source-of-truth pattern for adding or changing one
---

# Tauri Command Flow

A recommended pattern for keeping commands type-safe and discoverable in a
Tauri v2 app: keep command (and event) **names as constants in Rust** as the
single source of truth, and generate the TypeScript names from them. This avoids
stringly-typed `invoke('...')` calls drifting out of sync with the backend.

## The contract for adding/renaming/removing a command

1. **Declare the name constant** in a central Rust module (e.g.
   `src-tauri/src/constants/commands.rs`): `MY_COMMAND = "my_command"`. Use
   snake_case matching the Rust fn name exactly.
2. **Write the command** in the feature's `commands.rs` (see
   [tauri-feature-module-anatomy.md](tauri-feature-module-anatomy.md)).
3. **Register it** in `src-tauri/src/lib.rs` inside
   `tauri::generate_handler![ ... ]` using the full path, e.g.
   `features::settings::commands::my_command`.
4. **Regenerate the TS name bindings** (e.g. a `gen:bindings` script run as part
   of `dev`/`build`). Run it manually after editing the constants so the new name
   is available while coding the frontend.

> Forgetting step 1 or 4 → the frontend has no typed name for the command.
> Forgetting step 3 → calling it throws "command not found" at runtime.

## Command anatomy

Keep commands thin: validate/extract args, delegate to a **service**, map the
error. Business logic does not live in the command.

```rust
use tauri::{AppHandle, State};

#[tauri::command]
pub fn create_chat(
    id: String,
    workspace_id: String,
    title: String,
    state: State<'_, AppState>,        // inject shared state to reach services
) -> Result<Chat, AppError> {          // recommended: Result<T, AppError>
    state
        .chat_service
        .create(id, workspace_id, title)
        .map_err(|e| AppError::Generic(e.to_string()))
}
```

**Recommended rules:**

- Return `Result<T, AppError>` where `T: Serialize`. On `Err`, Tauri rejects the
  JS promise — see [tauri-error-handling.md](tauri-error-handling.md).
- Inject `state: State<'_, AppState>` to reach services (see
  [tauri-state-management.md](tauri-state-management.md)).
- Add `app: AppHandle` only when the command emits events (it builds an Emitter —
  see [tauri-events-and-emitters.md](tauri-events-and-emitters.md)).
- Use `async fn` when the work awaits (network/IO); sync `fn` otherwise. For
  long-running/streaming commands, return quickly and push progress via events
  rather than the return value.

A complete, layered command/service/repository example is in
[assets/example-feature/](../assets/example-feature/).

## Calling from the frontend

Prefer a thin typed wrapper over raw `invoke()`, so the constant names and a
single error-handling path are enforced. Example wrapper:
[assets/frontend/tauri.ts](../assets/frontend/tauri.ts).

```typescript
import { invokeCommand, TauriCommands } from '@/lib/tauri';

const chat = await invokeCommand<Chat>(TauriCommands.CREATE_CHAT, {
  id,
  workspaceId,
  title, // arg keys are camelCase; Tauri maps to snake_case
});
```

In practice, route most calls through a data-fetching layer (e.g. an RTK Query
endpoint built on the wrapper) — see
[tauri-frontend-data-layer.md](tauri-frontend-data-layer.md). Use a raw
`invokeCommand` only for one-off, non-cached calls.

> Tauri converts camelCase JS arg keys to snake_case Rust params automatically,
> so `workspaceId` in JS maps to `workspace_id` in Rust.
