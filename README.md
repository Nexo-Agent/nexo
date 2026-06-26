<p align="center">
    <img width="200" alt="Cogito Studio Logo" src="https://raw.githubusercontent.com/CogitoForge-AI/cogito-studio/refs/heads/main/logo.svg">
</p>

<h1 align="center">Cogito Studio - All-in-One Workspace AI</h1>

<div align="center">
  
  [![publish](https://github.com/CogitoForge-AI/cogito-studio/actions/workflows/build.yaml/badge.svg)](https://github.com/CogitoForge-AI/cogito-studio/actions/workflows/build.yaml)
  ![Vercel Deploy](https://deploy-badge.vercel.app/vercel/studio-cogito-ai-org?style=flat-square&name=website)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## About

Cogito Studio is a cross-platform desktop AI assistant built with Tauri, React, and Rust. It provides a seamless interface for interacting with multiple LLM providers while offering advanced features like MCP (Model Context Protocol) integration, workspace management, and extensible tool support.

## Key Advantages:

- **True Freedom**: Use any LLM provider with your own API keys - no vendor lock-in
- **Privacy-Focused**: All conversations stored locally in SQLite, no data sent to third parties
- **Extensible**: MCP protocol support + Python/Node runtime for unlimited tool possibilities
- **Customizable**: Full control over system prompts, workspace settings, and UI preferences
- **Cost-Effective**: Pay only for LLM API usage, no subscription fees
- **Community-Driven**: Open source with active development and community contributions

## Installation

### macOS

```bash
bash <(curl -fsSL https://studio.cogito-ai.org/installer.sh)
```

Download the `.dmg` installer from [Releases](https://github.com/CogitoForge-AI/cogito-studio/releases).

### Linux

```bash
bash <(curl -fsSL https://studio.cogito-ai.org/installer.sh)
```

Download the `.deb` or `.AppImage` from [Releases](https://github.com/CogitoForge-AI/cogito-studio/releases).

### Windows

Run in PowerShell:

```powershell
& ([ScriptBlock]::Create((iwr -useb https://studio.cogito-ai.org/installer-windows.ps1)))
```

Download the `.msi` or `.exe` installer from [Releases](https://github.com/CogitoForge-AI/cogito-studio/releases).

#### Options

Pin a version (macOS/Linux):

```bash
VERSION=0.1.0-beta.22 bash <(curl -fsSL https://studio.cogito-ai.org/installer.sh)
```

Pin a version (Windows):

```powershell
& ([ScriptBlock]::Create((iwr -useb https://studio.cogito-ai.org/installer-windows.ps1))) -Version "0.1.0-beta.22"
```

Silent install on Windows (run PowerShell as Administrator):

```powershell
& ([ScriptBlock]::Create((iwr -useb https://studio.cogito-ai.org/installer-windows.ps1))) -Silent
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=CogitoForge-AI/cogito-studio&type=timeline&legend=top-left)](https://www.star-history.com/#CogitoForge-AI/cogito-studio&type=timeline&legend=top-left)

<div align="center">
  <p>Made with ❤️ by the Cogito Studio community</p>
  <p>
    <a href="https://github.com/CogitoForge-AI/cogito-studio/stargazers">⭐ Star us on GitHub</a> •
    <a href="https://studio.cogito-ai.org">🌐 Visit Website</a>
  </p>
</div>
