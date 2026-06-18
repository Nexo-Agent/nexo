---
name: tauri-apps-development
description: >
  Conventions and workflows for developing Tauri v2 desktop apps with a
  React + TypeScript frontend and a Rust backend. Use when adding or modifying
  features, fixing or debugging bugs, refactoring, writing tests, committing,
  or cutting a release in a Tauri v2 codebase. Covers the command/event IPC
  contract, typed backend↔frontend communication, error handling, state,
  SQLite storage, capabilities/permissions, and release/versioning. Patterns
  are distilled from a real reference app (Nexo) with full example sources under
  assets/.
license: MIT
allowed-tools: Bash(yarn:*) Bash(npm:*) Bash(pnpm:*) Bash(cargo:*) Bash(git:*) Read Edit Write Grep Glob
metadata:
  author: Nguyen Khac Thanh - <ask@nkthanh.dev>
  version: '0.0.1'
---

# Tauri Apps Development

Conventions and workflows for building Tauri v2 desktop apps (React + TypeScript
frontend, Rust backend in `src-tauri/`). This file is an index — read the linked
reference files for the actual rules and patterns, and see `assets/` for complete
example source files to imitate.

> **Read [references/workflow-common-rules.md](references/workflow-common-rules.md)
> first.** It holds the rules that apply to every task: communication,
> code quality, mandatory verification, and the non-negotiable IPC rules.

## Workflows — pick by intent

Read the matching file before acting; each contains the step-by-step process.

| Intent                                                            | File                                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Common rules (read first, always applies)                         | [references/workflow-common-rules.md](references/workflow-common-rules.md) |
| Add a new feature or modify an existing one                       | [references/workflow-feature.md](references/workflow-feature.md)           |
| Fix a bug whose cause is already clear                            | [references/workflow-fix.md](references/workflow-fix.md)                   |
| Investigate a bug whose cause is unknown (no fixes, logging only) | [references/workflow-debug.md](references/workflow-debug.md)               |
| Improve structure without changing behavior                       | [references/workflow-refactor.md](references/workflow-refactor.md)         |
| Create or update unit tests                                       | [references/workflow-test.md](references/workflow-test.md)                 |
| Explain how a feature, function, or file works                    | [references/workflow-explain.md](references/workflow-explain.md)           |
| Answer a general question (no code changes)                       | [references/workflow-ask.md](references/workflow-ask.md)                   |
| Stage and commit changes (Conventional Commits)                   | [references/workflow-commit.md](references/workflow-commit.md)             |
| Create and push a release tag                                     | [references/workflow-release.md](references/workflow-release.md)           |

If no workflow matches, ask the user which they intend, and apply the common
rules + Tauri conventions below.

## Tauri architecture knowledge

Read the relevant file before writing backend/IPC code. These document
recommended, opinionated conventions for Tauri v2 apps; each links to a complete
example under `assets/`.

| Topic                                                           | File                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Adding/changing a command (Rust → bindings → frontend)          | [references/tauri-command-flow.md](references/tauri-command-flow.md)                       |
| Backend feature layout (models→repository→service→commands)     | [references/tauri-feature-module-anatomy.md](references/tauri-feature-module-anatomy.md)   |
| Shared state (state container, Arc, manage, std vs tokio Mutex) | [references/tauri-state-management.md](references/tauri-state-management.md)               |
| Error convention (`AppError`, `[Category] message`, full-stack) | [references/tauri-error-handling.md](references/tauri-error-handling.md)                   |
| Backend→frontend events (typed payloads, Emitter structs)       | [references/tauri-events-and-emitters.md](references/tauri-events-and-emitters.md)         |
| Database (rusqlite, connection-per-op, in-place migrations)     | [references/tauri-database-conventions.md](references/tauri-database-conventions.md)       |
| Frontend data layer (RTK Query over Tauri, tags, streaming)     | [references/tauri-frontend-data-layer.md](references/tauri-frontend-data-layer.md)         |
| Capabilities/permissions, plugins, config & versioning          | [references/tauri-capabilities-and-config.md](references/tauri-capabilities-and-config.md) |

Complete example sources are in [assets/](assets/) — see
[assets/README.md](assets/README.md) for the map.
