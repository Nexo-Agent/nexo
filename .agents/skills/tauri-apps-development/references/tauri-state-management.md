---
description: How to define, assemble, and access shared application state in a Tauri v2 app (a state container, Arc, manage, std vs tokio Mutex)
---

# State Management (Tauri v2 backend)

A clean way to share backend services in Tauri v2: hold them in a single state
container struct, register it once with `app.manage(...)` during setup, and read
it in commands via `State<'_, AppState>`. Read this before adding a service or new
shared state. Full example:
[assets/backend/app_state.rs](../assets/backend/app_state.rs).

## A single state container

Put every service in one struct, each `Arc`-wrapped so it can be shared across
threads and async tasks cheaply.

```rust
pub struct AppState {
    // Services (injected dependencies) — all Arc-wrapped
    pub chat_service: Arc<ChatService>,
    pub message_service: Arc<MessageService>,
    pub settings_service: Arc<AppSettingsService>,
    // ...

    // Cross-cutting runtime state (not a service), e.g. in-flight requests:
    pub pending_permissions: Arc<Mutex<HashMap<String, oneshot::Sender<Decision>>>>,
}
```

## Assembly and registration

Build the container in the Tauri `.setup()` hook (wiring `Arc<dyn Repo>` into
services) and hand it to Tauri with `manage`:

```rust
// src-tauri/src/lib.rs (inside .setup(|app| { ... }))
let app_handle = Arc::new(app.handle().clone());
let app_state = AppState::new(app_handle)?;   // builds all services
app.manage(app_state);                         // now reachable via State<'_, AppState>

// Independent runtime states get their own manage() call:
app.manage(SomeOtherState::new());
```

> A managed type must be `Send + Sync + 'static`, and there can be only **one**
> managed value per type. That's why all services live inside the single
> container rather than being managed individually.

## Accessing state in a command

Inject `State<'_, AppState>` and reach the service (deref is automatic):

```rust
#[tauri::command]
pub fn get_chats(workspace_id: String, state: State<'_, AppState>) -> Result<Vec<Chat>, AppError> {
    state.chat_service.get_by_workspace_id(&workspace_id)
        .map_err(|e| AppError::Generic(e.to_string()))
}
```

## `std::sync::Mutex` vs `tokio::sync::Mutex` — pick deliberately

This distinction matters and is easy to get wrong:

- Use **`std::sync::Mutex`** for short, synchronous critical sections (a quick
  `HashMap` insert/lookup). Never hold its guard across an `.await` — that can
  deadlock the async runtime.
- Use **`tokio::sync::Mutex`** when the lock must be held **across `.await`**
  points (e.g. a map of cancellation channels locked while awaiting async work).

Channels follow the same logic: `oneshot` for a single response, `broadcast` for
fan-out signals like cancellation.

## Adding new shared state — checklist

- [ ] New service is `Send + Sync`, constructed in the container's `new`
- [ ] Field added to the container struct, wrapped in `Arc`
- [ ] Interior mutability? choose `std` vs `tokio` Mutex per the rule above
- [ ] Truly independent runtime state → its own `app.manage(...)` + its own type
- [ ] Commands access it through `State<'_, AppState>`, never via globals

See [tauri-feature-module-anatomy.md](tauri-feature-module-anatomy.md) for how a
service is layered, and [tauri-command-flow.md](tauri-command-flow.md) for how
commands consume it.
