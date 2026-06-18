# Example sources

Complete, working example files that the reference docs point to. They are
extracted from a real Tauri v2 application and illustrate the patterns described
in `references/tauri-*.md`. Treat them as concrete examples to imitate, not as a
dependency — adapt names and structure to your own app.

| File                                                            | Illustrates                                               | Referenced by                                           |
| --------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `example-feature/` (commands, service, repository, models, mod) | A complete layered backend feature                        | `tauri-feature-module-anatomy.md`                       |
| `backend/app_error.rs`                                          | Typed error enum, `[Category]` format, custom `Serialize` | `tauri-error-handling.md`                               |
| `backend/message_emitter.rs`                                    | Per-domain Emitter struct wrapping `app.emit`             | `tauri-events-and-emitters.md`                          |
| `backend/events.rs`                                             | Typed event payload structs                               | `tauri-events-and-emitters.md`                          |
| `backend/event_names.rs`                                        | Event name constants (single source of truth)             | `tauri-events-and-emitters.md`                          |
| `backend/app_state.rs`                                          | Shared state container (`Arc` services)                   | `tauri-state-management.md`                             |
| `backend/db_connection.rs`                                      | DB path + connection helpers                              | `tauri-database-conventions.md`                         |
| `backend/db_migrations.rs`                                      | Idempotent in-place migrations                            | `tauri-database-conventions.md`                         |
| `frontend/tauri.ts`                                             | Typed `invokeCommand` / `listenToEvent` wrapper           | `tauri-command-flow.md`, `tauri-events-and-emitters.md` |
| `frontend/base_api.ts`                                          | RTK Query base query over Tauri invoke                    | `tauri-frontend-data-layer.md`                          |
| `frontend/feature_api.ts`                                       | RTK Query endpoints with tag invalidation                 | `tauri-frontend-data-layer.md`                          |
| `config/capabilities.json`                                      | Tauri v2 capability/permission scoping                    | `tauri-capabilities-and-config.md`                      |
