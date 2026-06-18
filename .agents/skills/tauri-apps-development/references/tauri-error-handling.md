---
description: A full-stack error convention for Tauri v2 — a typed AppError enum with a [Category] format, custom serialization, and frontend parsing
---

# Error Handling (Tauri v2, full-stack)

A robust pattern for errors that cross the Rust↔JS boundary: define one typed
error enum, serialize it to a **single formatted string** whose shape is a
contract — `[Category] message` — and parse it back on the frontend into a
category + message for category-aware UI (toasts, icons). Keep the format
identical on both ends.

Full example: [assets/backend/app_error.rs](../assets/backend/app_error.rs).

## Backend: the `AppError` enum

Define it once with `thiserror`. Every variant's `#[error(...)]` string starts
with a `[Category]` tag, and `#[from]` enables automatic conversion via `?`.

```rust
#[derive(Error, Debug)]
pub enum AppError {
    #[error("[Database] {0}")]
    Database(#[from] rusqlite::Error),     // #[from] = auto-convert via `?`
    #[error("[Not Found] {0}")]
    NotFound(String),
    #[error("[Network] {0}")]
    Http(#[from] reqwest::Error),
    #[error("[Validation] {0}")]
    Validation(String),
    #[error("[Cancelled] Operation cancelled by user")]
    Cancelled,                              // no payload — graceful cancel
    #[error("[Error] {0}")]
    Generic(String),                        // catch-all
    // ...domain variants as needed (Llm, Mcp, Io, Serialization, ...)
}
```

### Serialization (the key trick)

Tauri serializes the `Err` value and rejects the JS promise with it. Give
`AppError` a **manual `Serialize`** that emits its `Display` string, so the
frontend receives exactly `"[Category] message"`:

```rust
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: Serializer {
        serializer.serialize_str(self.to_string().as_str())
    }
}
```

### Conventions when producing errors

- Variants with `#[from]` auto-convert with `?` — e.g. a `rusqlite::Error`
  becomes `AppError::Database` automatically.
- For variants without `#[from]`, map explicitly:
  `.map_err(|e| AppError::Generic(e.to_string()))`. Prefer a **specific** variant
  over `Generic` when the domain is known, so the frontend can categorize it.
- Use a dedicated `Cancelled` variant for user-initiated cancellation; the
  frontend can treat it as a non-error stop, not a failure.
- Adding a new category? Add a variant **and** make the frontend handle the new
  `[Category]` tag (icon/toast).
- Optionally integrate error reporting (e.g. Sentry) behind a build-profile/env
  flag, reporting only unexpected errors — not validation/cancellation.

## Frontend: parsing the format

Reverse the format with a small parser:

```typescript
export function parseBackendError(error: unknown): {
  category?: string;
  message: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const match = errorMessage.match(/^\[(.*?)\]\s?(.*)/); // [Category] message
  if (match) return { category: match[1], message: match[2] || errorMessage };
  return { message: errorMessage };
}
```

Feed it into both paths: the data-fetching layer (so cache state carries
`{ category, message }` — see
[tauri-frontend-data-layer.md](tauri-frontend-data-layer.md)) and imperative
calls (parse + show a category-specific toast).

## The contract in one line

Backend `Err(AppError::<Category>(msg))` → string `"[Category] msg"` → frontend
`parseBackendError` → `{ category, message }` → categorized UI. Change the format
on one side and you must change it on both.
