# Development Guide

Welcome to the Nexo development guide! This document will help you set up your environment, build the project, and start contributing.

## 🛠 Prerequisites

Before you begin, ensure you have the following installed:

### 1. Core Tools

- **Node.js**: v18 or later (LTS recommended).
- **Yarn**: `npm install -g yarn` (we use Yarn for the frontend).
- **Rust**: Latest stable version via [rustup](https://rustup.rs).

### 2. Platform Specifics

#### macOS

- **Xcode Command Line Tools**: `xcode-select --install`

#### Linux (Debian/Ubuntu)

You need the webkit2gtk and appindicator libraries:

```bash
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

#### Windows

- **Microsoft Visual Studio C++ Build Tools** (Select "Desktop development with C++" workload).
- **WebView2**: Usually pre-installed on Windows 10/11.

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/magiskboy/nexo.git
cd nexo
```

### 2. Install Dependencies

```bash
# Frontend dependencies
yarn install

# Backend dependencies (automatically handled by Cargo, but good to check)
cd src-tauri
cargo check
cd ..
```

### 3. Run Development Server

This command starts both the Vite frontend server and the Tauri backend in watch mode.

```bash
yarn tauri:dev
```

_Note: The first run might take a few minutes to compile Rust dependencies._

---

## 🐛 Debugging

### Frontend Debugging

- **Webview Inspector**: Right-click anywhere in the app window and select **Inspect Element** to open Safari/Chrome DevTools.
- **Console**: Check the terminal output where `yarn tauri:dev` is running for frontend logs.

### Backend (Rust) Debugging

- **Logs**: We use `println!` for simple logging. Output appears in the terminal.
- **VS Code**:
  - Install the **rust-analyzer** and **CodeLLDB** extensions.
  - configuration in `.vscode/launch.json`:
    ```json
    {
      "name": "Debug Tauri",
      "type": "lldb",
      "request": "launch",
      "program": "${workspaceFolder}/src-tauri/target/debug/nexo",
      "args": [],
      "cwd": "${workspaceFolder}",
      "preLaunchTask": "ui:build"
    }
    ```

---

## 🏗 Build for Production

To create an optimized executable/installer for your current OS:

```bash
yarn tauri:build
```

The output will be located in `src-tauri/target/release/bundle/`.

---

## 🧪 Testing

### Rust Backend

Run the Rust test suite (ensure database migrations and unit tests pass):

```bash
cd src-tauri
cargo test
```

### Type Checking & Linting

Ensure code quality before committing:

```bash
yarn typecheck  # Run TypeScript compiler
yarn lint       # Run ESLint
yarn format     # Run Prettier
```

---

## 🧹 Cleanup

If you run into weird build errors, try cleaning the artifacts:

```bash
rm -rf node_modules
yarn install
cd src-tauri
cargo clean
```
