# Coding Rules & Invariants

> [!IMPORTANT]
> These rules are strict constraints. Violating them may cause build failures, runtime errors, or architectural degradation.

## General Principles

- **Clean Code**: Prioritize readability and maintainability over clever hacks.
- **Type Safety**: strict TypeScript configuration. No `any` unless absolutely necessary (and must be commented).
- **Error Handling**: Explicit error handling. No swallowing errors.

## Frontend (React/TypeScript)

### 1. State Management

- **Redux Toolkit**: usage is mandatory for global state.
- **Typed Hooks**: ALWAYS use `useAppDispatch` and `useAppSelector` instead of `useDispatch` and `useSelector`.
- **Slices**: Keep logic inside slices (`src/store/slices`). Async logic goes into `createAsyncThunk`.

### 2. Component Structure

- **Location**: All UI components go in `src/ui`.
- **Shadcn UI**: Do not modify `src/ui/atoms` directly if possible; wrap them or compose them.
- **Props Interface**: Define props interface immediately before the component, named `[ComponentName]Props`.
- **Functional Components**: Use `export const [Name] = (...) => { ... }` syntax relative to the file.

### 3. Tauri Integration

- **Commands**: Never call `invoke` directly in components. Create a wrapper function in `src/lib/api` or similar if available, or keep them typed.
- **Events**: Use strong typing for event payloads.

### 4. Internationalization

- **Strings**: No hardcoded strings in UI. Use `t('key')` from `useTranslation`.
- **Keys**: snake_case or nested.structure.

## Backend (Rust)

### 1. Architectural Layers (Strict)

Data flow must follow this path:
`Command` -> `Service` -> `Repository` -> `Database`

- **Commands** (`src-tauri/src/commands`): Handle deserialization and call Services. Return `Result`.
- **Services** (`src-tauri/src/services`): Business logic. Transaction management.
- **Repositories** (`src-tauri/src/repositories`): ONLY raw SQL queries and Struct mapping.
- **Models** (`src-tauri/src/models`): Pure data structures (Structs).

### 2. Database (SQLite)

- **Queries**: Use parameterized queries (`?1`, `?2`) to prevent injection.
- **Migrations**: Database schema changes must be recorded in `src-tauri/src/db/migrations.rs`.

### 3. Error Handling

- **Result Type**: Return `Result<T, CommandError>` (or app-specific error) from commands.
- **Anyhow**: Use `anyhow::Result` for internal logic but convert to serializable error for frontend.

### 4. Async

- **Tokio**: Use `#[tokio::main]` for the entry point.
- **Blocking**: Avoid blocking the main thread. Use `spawn_blocking` for heavy synchronous operations.

## File & Naming Conventions

- **Rust Files**: `snake_case.rs`
- **React Components**: `PascalCase.tsx`
- **TS Utilities**: `camelCase.ts` or `kebab-case.ts`
- **Directories**: `kebab-case` generally preferred.
