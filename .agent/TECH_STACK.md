# Technology Stack & Versions

> [!IMPORTANT]
> This file serves as the strict source of truth for the project's technology stack. AI agents MUST check this file before generating code to avoid using incompatible libraries or outdated syntax.

## Core Frameworks

- **Platform**: [Tauri v2](https://v2.tauri.app) (Alpha/Beta - check `Cargo.toml` for exact version)
- **Frontend Framework**: [React v18](https://react.dev)
- **Build Tool**: [Vite v6](https://vitejs.dev)
- **Language**: TypeScript (Frontend), Rust (Backend)

## Frontend Ecosystem

### UI & Styling

- **Styling Engine**: [Tailwind CSS v4](https://tailwindcss.com) (Note: v4 implies simplified configuration, no `tailwind.config.js` usually)
- **Component Primitives**: [Radix UI](https://www.radix-ui.com)
- **Component Library**: [shadcn/ui](https://ui.shadcn.com) (Copy-paste architecture)
- **Icons**: [Lucide React](https://lucide.dev)
- **Animations**: `tw-animate-css`

### State & Data

- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org) (`@reduxjs/toolkit`)
- **React Integration**: `react-redux`
- **Form Management**: `react-hook-form` + `@hookform/resolvers` + `zod`

### markdown & Content

- **Markdown Engine**: `react-markdown`
- **Syntax Highlighting**: `highlight.js`, `shiki`, `rehype-highlight`
- **Math Rendering**: `katex`, `rehype-katex`, `remark-math`
- **Diagrams**: `mermaid`
- **Streaming Parser**: `streamdown` (Custom or specific library)

### Internationalization

- **Library**: `i18next`, `react-i18next`
- **Detection**: `i18next-browser-languagedetector`
- **Extraction**: `i18next-scanner`

## Backend Ecosystem (Rust)

### Core

- **Edition**: Rust 2021
- **Async Runtime**: `tokio` (feature: `full`)
- **Serialization**: `serde`, `serde_json`, `serde_yaml`
- **Error Handling**: `anyhow`, `thiserror`

### Database

- **Engine**: SQLite
- **Driver**: `rusqlite` (bundled)

### AI & Integration

- **MCP**: `rust-mcp-sdk`, `rust-mcp-transport`, `rust-mcp-schema`
- **HTTP Client**: `reqwest`

### System

- **Compression**: `zip`, `tar`, `flate2`

## Development Tools

- **Package Manager**: Yarn
- **Linting**: ESLint v9 (Flat config `eslint.config.js`)
- **Formatting**: Prettier
- **Rust Linting**: Cargo Clippy
- **Hooks**: Husky

## Specific Version Constraints

- **Node.js**: >= 18 (Check `engines` in package.json if present)
- **Tauri Plugin**: `tauri-plugin-opener`, `tauri-plugin-clipboard-manager` (~2)
