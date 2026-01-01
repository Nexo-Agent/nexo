# Project Structure Map

> [!NOTE]
> This map helps AI agents navigate the codebase by understanding the semantic purpose of each directory.

## Root Directory

- `.agent/`: Knowledge base for AI agents (This directory).
- `src-tauri/`: Rust backend and Tauri configuration.
- `src/`: React frontend source code.
- `scripts/`: Maintenance and build scripts.

## Frontend (`src/`)

- `src/assets/`: Static assets (images, fonts).
- `src/bindings/`: Generated TS types from Rust (via `ts-rs` or Tauri bindings).
- `src/hooks/`: Custom React hooks.
- `src/i18n/`: Internationalization configs and locales.
- `src/lib/`: Utility libraries and shared helpers.
- `src/store/`: Redux store configuration.
  - `src/store/slices/`: Redux state slices (reducers/actions).
- `src/types/`: shared TypeScript type definitions.
- `src/ui/`: UI Components.
  - `src/ui/atoms/`: Shadcn UI primitives (Buttons, Inputs) and base atoms.
  - `src/ui/chat-area/`: Chat interface specific components.
  - `src/ui/chat-search/`: Chat history search components.
  - `src/ui/markdown-content/`: Markdown rendering logic.
  - `src/ui/settings/`: Settings pages.
  - `src/ui/workspace/`: Workspace management UI.
  - `src/ui/AppLayout.tsx`: Main application layout structure.
  - `src/ui/ChatSidebar.tsx`: Sidebar for navigation and history.
  - `src/ui/TitleBar.tsx`: Custom window title bar.
  - `src/ui/Welcome.tsx`: Onboarding/Welcome screen.

## Backend (`src-tauri/src/`)

- `bin/`: Additional binaries or entry points.
- `commands/`: **[Layer 1]** Tauri Commands (API Endpoints). Exposed to Frontend.
- `services/`: **[Layer 2]** Business Logic.
- `repositories/`: **[Layer 3]** Data Access Layer (SQL queries).
- `models/`: Data structures (Rust Structs).
- `db/`: Database connection and migration logic.
- `events/`: Event definitions for backend-to-frontend communication.
- `error/`: Custom error types (`CommandError`, etc.).
- `state/`: Application state managed by Tauri (AppState).
- `constants/`: System-wide constants.

## Key Files

- `package.json`: Frontend dependencies and scripts.
- `src-tauri/Cargo.toml`: Backend dependencies.
- `src-tauri/tauri.conf.json`: Tauri application configuration.
- `src-tauri/src/lib.rs`: Main library entry point (Tauri setup).
- `src/App.tsx`: Main React component.
- `src/main.tsx`: Frontend entry point.
