---
description: A recommended layered structure for a backend feature module in a Tauri v2 app (models, repository, service, commands, emitter)
---

# Feature Module Anatomy (Tauri v2 backend)

A scalable way to organize Rust backend code is by **feature**, with each feature
following the same layered layout. A complete working example is in
[assets/example-feature/](../assets/example-feature/) — read it alongside this.

## Layout

```
src-tauri/src/features/<name>/
├── models.rs       # Data structs (Serialize + Deserialize). The wire types.
├── repository.rs   # Trait + storage impl. ALL data-access/SQL lives here.
├── service.rs      # Business logic. Orchestrates repositories/other services.
├── commands.rs     # #[tauri::command] handlers. Thin; delegate to service.
├── emitter.rs      # (optional) Event emission for this domain.
└── mod.rs          # Module declarations + public re-exports.
```

Large features can split into sub-modules (e.g. `workspace/management/`,
`workspace/settings/`), each repeating the same layer set, with a struct in
`mod.rs` grouping the sub-services.

## Layer responsibilities & dependency direction

`commands → service → repository → (storage)`. Dependencies point downward only;
a repository never knows about a command.

### 1. `repository.rs` — trait + implementation

Define a trait (`Send + Sync` so it can live in `Arc` inside shared state), then a
concrete implementation. Services depend on `Arc<dyn XRepository>`, which keeps
business logic testable with a mock repository.

```rust
pub trait ChatRepository: Send + Sync {
    fn create(&self, chat: &Chat) -> Result<(), AppError>;
    fn get_by_workspace_id(&self, workspace_id: &str) -> Result<Vec<Chat>, AppError>;
}

pub struct SqliteChatRepository { /* handle to storage */ }

impl ChatRepository for SqliteChatRepository {
    fn create(&self, chat: &Chat) -> Result<(), AppError> {
        // ...persist...
        Ok(())
    }
}
```

Storage/connection conventions: see
[tauri-database-conventions.md](tauri-database-conventions.md). Full example:
[assets/example-feature/repository.rs](../assets/example-feature/repository.rs).

### 2. `service.rs` — business logic

Holds `Arc`-wrapped dependencies; pure logic, no Tauri attributes.

```rust
pub struct ChatService {
    repository: Arc<dyn ChatRepository>,
    // other Arc<...> collaborators
}
```

Example: [assets/example-feature/service.rs](../assets/example-feature/service.rs).

### 3. `commands.rs` — thin handlers

Delegate to the service and map errors — see
[tauri-command-flow.md](tauri-command-flow.md). Example:
[assets/example-feature/commands.rs](../assets/example-feature/commands.rs).

### 4. `mod.rs` — declare + re-export

```rust
pub mod commands;
pub mod emitter;
pub mod models;
pub mod repository;
pub mod service;

pub use emitter::ChatEmitter;
pub use repository::*;
pub use service::*;
```

## Wiring a new feature into the app

Construct the new service and store it in the shared state container (built in
`lib.rs`'s `.setup()`), then register its commands in `generate_handler!`. See
[tauri-state-management.md](tauri-state-management.md).

## Checklist for a new feature

- [ ] `models.rs` types derive `Serialize, Deserialize` (and `Clone` if emitted)
- [ ] `repository.rs` exposes a `Send + Sync` trait + a concrete impl
- [ ] `service.rs` depends on `Arc<dyn Repo>`, not the concrete type
- [ ] `commands.rs` handlers are thin and return `Result<T, AppError>`
- [ ] `mod.rs` re-exports the public service/repository/emitter
- [ ] service constructed in the shared state and field added to the struct
- [ ] commands registered in `lib.rs` `generate_handler!`
- [ ] name constants added + bindings regenerated
