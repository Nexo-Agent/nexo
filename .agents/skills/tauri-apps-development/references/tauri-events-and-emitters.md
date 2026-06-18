---
description: A typed backend-to-frontend event system for Tauri v2 — name constants, typed payload structs, per-domain Emitter structs, and the frontend listen/cleanup + cache-update pattern
---

# Events & Emitters (Tauri v2, full-stack)

When the backend needs to **push** data to the frontend (streaming output,
progress, background completion) rather than return it from a command, use
Tauri's event system. This is a recommended way to keep it typed on both ends and
centralized, which makes it robust and refactor-safe.

Example files:
[assets/backend/message_emitter.rs](../assets/backend/message_emitter.rs),
[assets/backend/events.rs](../assets/backend/events.rs),
[assets/backend/event_names.rs](../assets/backend/event_names.rs).

## The four pieces

A complete event touches four coordinated parts — update all four when adding or
renaming an event:

| Piece          | Suggested location                  | Role                                           |
| -------------- | ----------------------------------- | ---------------------------------------------- |
| Name constant  | `src-tauri/src/constants/events.rs` | Single source of truth (kebab-case)            |
| Payload struct | `src-tauri/src/events/mod.rs`       | Typed body (`Serialize+Deserialize+Clone`)     |
| Emitter method | feature `emitter.rs`                | Wraps `app.emit` with the right name + payload |
| FE listener    | a hook                              | `listen` + cleanup; updates client state/cache |

After editing name constants, regenerate the TS name bindings.

## 1. Name constants (kebab-case)

```rust
impl TauriEvents {
    pub const MESSAGE_STARTED: &'static str = "message-started";
    pub const MESSAGE_CHUNK: &'static str   = "message-chunk";
    pub const TOOL_PERMISSION_REQUEST: &'static str = "tool-permission-request";
    // ...grouped by domain
}
```

Event names are **kebab-case** (`message-chunk`), in contrast to snake_case
command names (`send_message`). Group them by domain.

## 2. Typed payload structs

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageChunkEvent {
    pub chat_id: String,
    pub message_id: String,
    pub chunk: String,
}
```

Always derive `Serialize, Deserialize, Clone` (Clone because emitters take owned
values). Rust field names are snake_case and arrive as-is in JS, so the frontend
interface mirrors them (`chat_id`, not `chatId`).

## 3. Per-domain Emitter struct — the core idea

Instead of scattering `app.emit("...")` literals across services, wrap each
domain's events in an **Emitter struct** holding an `AppHandle`. This keeps names
and payloads in one place, gives every emit a typed method, and returns
`Result<(), AppError>`.

```rust
use tauri::{AppHandle, Emitter};

pub struct MessageEmitter { app: AppHandle }

impl MessageEmitter {
    pub const fn new(app: AppHandle) -> Self { Self { app } }

    pub fn emit_message_chunk(
        &self, chat_id: String, message_id: String, chunk: String,
    ) -> Result<(), AppError> {
        self.app
            .emit(
                TauriEvents::MESSAGE_CHUNK,
                MessageChunkEvent { chat_id, message_id, chunk },
            )
            .map_err(|e| AppError::Generic(format!("Failed to emit message-chunk: {e}")))
    }
}
```

Keep one emitter per domain (e.g. `MessageEmitter`, `AgentEmitter`,
`ToolEmitter`). A service constructs the emitter from an `AppHandle` it received
(a command passes `app: AppHandle` down).

**When adding an event:** add a method to the existing domain emitter rather than
calling `app.emit` directly elsewhere. Create a new emitter only for a genuinely
new domain.

> `emit` broadcasts to all webviews; use `emit_to(label, ...)` to target a
> specific window. For a single-window app, `emit` is the simplest correct choice.

## 4. Frontend: listen, update cache, clean up

Listen via a typed wrapper (see
[assets/frontend/tauri.ts](../assets/frontend/tauri.ts)) and translate events
into **in-place cache updates** — so streaming chunks mutate the cached entity
rather than triggering a refetch. This is the high-value part: the backend
streams, the UI updates incrementally with no extra round-trips.

```typescript
interface MessageChunkEvent {
  chat_id: string;
  message_id: string;
  chunk: string;
}

const unlistenChunk = listenToEvent<MessageChunkEvent>(
  TauriEvents.MESSAGE_CHUNK,
  (payload) => {
    dispatch(
      messagesApi.util.updateQueryData(
        'getMessages',
        payload.chat_id,
        (draft) => {
          const message = draft.find((m) => m.id === payload.message_id);
          if (message) message.content += payload.chunk; // append streamed token
        }
      )
    );
  }
);
```

(See [tauri-frontend-data-layer.md](tauri-frontend-data-layer.md) for the cache
layer.)

**Cleanup is mandatory.** `listen` returns an unlisten function; collect them and
call all on unmount (or guard with an `isMounted` flag), or you leak listeners
across re-renders:

```typescript
const unlisteners: Array<() => void> = [];
// ...push each unlisten...
return () => {
  unlisteners.forEach((u) => u());
};
```

## The contract (keep both ends in sync)

```
name constant  →  payload struct  →  emitter method (app.emit)
       │                                      │
  regenerate bindings                 app.emit(NAME, payload)
       │                                      ▼
   TS name binding  ←──────  listen<Payload>(NAME, handler)
                                              │
                                  update client cache / state
                                              │
                                     cleanup unlisten on unmount
```

Rename an event → change the constant + payload + emitter + FE interface and
regenerate bindings — all four, or the listener silently never fires.
