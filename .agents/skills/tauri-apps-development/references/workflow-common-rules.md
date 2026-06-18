---
description: Common rules that apply to ALL workflows — communication, code quality, verification, and the non-negotiable Tauri IPC rules. Read this before any task.
---

# Common Workflow Rules

These rules apply to **every** workflow. Read this first, then open the specific
workflow file.

## Non-negotiable IPC rules

The mistakes most likely to break the frontend↔backend boundary. Detailed
guidance is in the `tauri-*` knowledge files; the rules themselves are absolute:

1. **Names are single-source-of-truth in Rust.** When you add/rename/remove a
   command or event, follow the full chain: declare the constant in
   `src-tauri/src/constants/{commands,events}.rs` → implement → register the
   command in `lib.rs` `generate_handler!` → run `yarn gen:bindings`. Missing any
   step makes the command/event invisible or "not found". See
   [tauri-command-flow.md](tauri-command-flow.md) and
   [tauri-events-and-emitters.md](tauri-events-and-emitters.md).
2. **Never call `invoke()` raw on the frontend.** Always use `invokeCommand` /
   `listenToEvent` from `src/lib/tauri.ts` (usually via an RTK Query endpoint —
   see [tauri-frontend-data-layer.md](tauri-frontend-data-layer.md)).
3. **Every command returns `Result<T, AppError>`.** Keep the `[Category] message`
   error format so the frontend's `parseBackendError` can categorize it; prefer a
   specific `AppError` variant over `Generic`. See
   [tauri-error-handling.md](tauri-error-handling.md).
4. **Backend pushes via events, returns via `Result`.** Long-running/streaming
   work emits typed events through a domain Emitter; it does not block the command
   return. Frontend listeners must clean up (unlisten) on unmount.

## Communication

1. **Respond in Vietnamese.** Always.
2. **No emojis** in responses.
3. Be clear, direct, and goal-oriented. Explain before taking significant action
   and get confirmation for significant changes.
4. **Use English** for all source code, variable/function/file names, and code
   comments — and for technical terms when the Vietnamese equivalent is ambiguous.

## Code quality

1. **Follow project standards.** Read and follow the project's coding rules
   (`.agent/rules/coding.md` / `CODING_RULES.md`) and stay consistent with
   existing patterns.
2. **Type safety.** No `any` unless unavoidable; when used, document why with a
   comment. Always add proper TypeScript types.
3. **Error handling.** Handle errors explicitly. Use proper error types
   (`AppError` on the Rust side). Never swallow errors silently.
4. **Documentation.** Comment complex logic and update docs when behavior changes.

## Verification (MANDATORY for any code change)

Run the checks for whichever side(s) you touched, using the project's package
manager (yarn/npm/pnpm — match the lockfile). All must pass before reporting done.

**Frontend (TypeScript / React):**

```bash
<pm> lint --fix     # auto-fix formatting; must end with no errors
<pm> typecheck      # must pass with zero errors
```

Then check the browser console for runtime errors and verify the UI renders and
behaves correctly.

**Backend (Rust):**

```bash
cd src-tauri && cargo check     # must compile (add the project's feature flags if any)
cd src-tauri && cargo clippy    # address or justify warnings
cd src-tauri && cargo test      # if tests exist
```

**Full-stack:** verify both sides, test the end-to-end flow, and run
`<pm> tauri build` only when a change is critical enough to need a production build.

### Verification checklist

- [ ] Linting passes
- [ ] Type checking passes
- [ ] No console / compile errors
- [ ] Affected features work correctly
- [ ] No performance regressions
- [ ] Code follows project conventions

## Project documentation to consult

Depending on the task, review: `CODING_RULES.md`, `ARCHITECTURE.md`,
`TECH_STACK.md`, `UI_STRUCTURE.md`, `PROJECT_STRUCTURE_MAP.md`.
