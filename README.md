# Nexo

<div align="center">
  
  [![publish](https://github.com/magiskboy/nexo/actions/workflows/build.yaml/badge.svg)](https://github.com/magiskboy/nexo/actions/workflows/build.yaml)
  ![Vercel Deploy](https://deploy-badge.vercel.app/vercel/nexo-docs?style=flat-square&name=docs)
  ![Vercel Deploy](https://deploy-badge.vercel.app/vercel/nexo?style=flat-square&name=website)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  
  <h3>A Smart AI Assistant for Everyone</h3>
  <p>
    <strong>Nexo</strong> is a powerful, cross-platform desktop AI assistant built with Tauri, React, and Rust. It provides a seamless interface for interacting with multiple LLM providers while offering advanced features like MCP (Model Context Protocol) integration, workspace management, and extensible tool support.
  </p>
  
  <p>
    <a href="https://nexo.nkthanh.dev">🌐 Website</a> •
    <a href="#-features">Features</a> •
    <a href="#-installation">Installation</a> •
    <a href="#-why-nexo">Why Nexo?</a> •
    <a href="#-development">Development</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

## 🎯 Why Nexo?

Nexo stands out from other AI assistants by offering a unique combination of flexibility, privacy, and extensibility:

| Feature                     | Nexo                  | ChatGPT Desktop | Claude Desktop    | Cursor           | Other AI Clients |
| --------------------------- | --------------------- | --------------- | ----------------- | ---------------- | ---------------- |
| **Multi-LLM Support**       | ✅ Multiple providers | ❌ OpenAI only  | ❌ Anthropic only | ✅ Multiple      | ⚠️ Limited       |
| **MCP Integration**         | ✅ Full support       | ❌ No           | ✅ Yes            | ❌ No            | ❌ Rare          |
| **Open Source**             | ✅ MIT License        | ❌ Proprietary  | ❌ Proprietary    | ❌ Proprietary   | ⚠️ Varies        |
| **Privacy-First**           | ✅ Local database     | ❌ Cloud-based  | ❌ Cloud-based    | ❌ Cloud-based   | ⚠️ Varies        |
| **Workspace Management**    | ✅ Advanced           | ❌ Basic        | ❌ Basic          | ✅ Project-based | ⚠️ Limited       |
| **Custom Tool Integration** | ✅ MCP + Extensions   | ❌ No           | ✅ MCP only       | ✅ Extensions    | ⚠️ Limited       |
| **Cross-Platform**          | ✅ Mac/Win/Linux      | ✅ Mac/Win      | ✅ Mac/Win        | ✅ Mac/Win/Linux | ⚠️ Varies        |
| **Offline Capable**         | ✅ UI + Local data    | ❌ No           | ❌ No             | ❌ No            | ⚠️ Rare          |
| **Python/Node Runtime**     | ✅ Built-in           | ❌ No           | ❌ No             | ❌ No            | ❌ No            |
| **Self-Hosted**             | ✅ Full control       | ❌ No           | ❌ No             | ❌ No            | ⚠️ Some          |
| **Cost**                    | ✅ Free (BYO API)     | 💰 Subscription | 💰 Subscription   | 💰 Subscription  | ⚠️ Varies        |

### Key Advantages:

- 🔓 **True Freedom**: Use any LLM provider with your own API keys - no vendor lock-in
- 🔒 **Privacy-Focused**: All conversations stored locally in SQLite, no data sent to third parties
- 🛠️ **Extensible**: MCP protocol support + Python/Node runtime for unlimited tool possibilities
- 🎨 **Customizable**: Full control over system prompts, workspace settings, and UI preferences
- 💰 **Cost-Effective**: Pay only for LLM API usage, no subscription fees
- 🌍 **Community-Driven**: Open source with active development and community contributions

---

## ✨ Features

### 🤖 Multi-LLM Support

- Connect to multiple LLM providers (OpenAI, Anthropic, Google, and more)
- Switch between different models seamlessly
- Support for advanced features like thinking mode and reasoning effort

### 🔧 MCP (Model Context Protocol) Integration

- Connect to MCP servers for extended functionality
- Dynamic tool discovery and execution
- Permission-based tool execution control

### 📁 Workspace Management

- Organize conversations into workspaces
- Workspace-specific settings and configurations
- Custom system prompts per workspace

### 💬 Advanced Chat Features

- Run code in the chat
- LaTeX and mathematical notation rendering (via KaTeX)
- Code syntax highlighting (via highlight.js and Shiki)
- Mermaid diagram support

### 🎨 Modern UI/UX

- Clean, intuitive interface built with React and Tailwind CSS
- Minimalistic design

### 🔌 Extensibility

- Python runtime management for executing Python-based tools
- Node.js runtime management for JavaScript-based tools
- Addon system for extending functionality
- Custom prompt management

### 🔒 Privacy & Security

- Local-first architecture
- No telemetry or data collection
- Full control over your data

---

## 🚀 Installation

### From Release (Recommended)

1. Download the latest release for your platform from the [Releases](https://github.com/magiskboy/nexo/releases) page
2. Install the application:
   - **macOS**: Open the `.dmg` file and drag Nexo to Applications
   - **Linux**: Install the `.deb` or `.AppImage` file
   - **Windows**: Run the `.msi` installer

### From Source

**Prerequisites**

- **Node.js** (LTS version recommended)
- **Yarn** package manager
- **Rust** (latest stable version)
- Platform-specific dependencies:
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`
  - **Windows**: WebView2 (usually pre-installed on Windows 10/11)

```bash
# Clone the repository
git clone https://github.com/magiskboy/nexo.git
cd nexo

# Install dependencies
yarn install

# Build for production
yarn tauri:build
```

---

## 📖 Usage

### Getting Started

1. **Launch Nexo** and you'll be greeted with the welcome screen
2. **Create a workspace** to organize your conversations
3. **Configure LLM connections** in Settings → LLM Connections
4. **Start chatting** with your AI assistant!

### Configuring LLM Connections

1. Navigate to **Settings** → **LLM Connections**
2. Click **Add Connection**
3. Enter your API credentials and endpoint
4. Test the connection
5. Save and select as default

### Using MCP Servers

1. Navigate to **Settings** → **MCP Servers**
2. Add your MCP server connection details
3. Enable the server
4. Tools from the MCP server will be automatically available in your chats

### Workspace Settings

Each workspace can have its own:

- Default LLM model
- System prompt
- Temperature and other generation parameters
- Enabled MCP servers and tools

### Keyboard Shortcuts

- `Cmd/Ctrl + N`: New chat
- `Cmd/Ctrl + ,`: Open settings
- `Cmd/Ctrl + K`: Keyboard shortcuts reference
- `Cmd/Ctrl + /`: Toggle command palette
- `Esc`: Close dialogs

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/magiskboy/nexo/issues)
2. If not, create a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Your environment (OS, version, etc.)

### Suggesting Features

1. Check [Issues](https://github.com/magiskboy/nexo/issues) for similar suggestions
2. Create a new issue with the `enhancement` label
3. Describe the feature and its use case

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests and linting: `yarn typecheck && yarn lint && yarn lint:rust`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all CI checks pass

---

## 🏗️ Building from Source

### Prerequisites

Ensure you have all the [installation prerequisites](#prerequisites) installed.

### Build Steps

```bash
# Clone the repository
git clone https://github.com/magiskboy/nexo.git
cd nexo

# Install dependencies
yarn install

# Generate bindings
yarn gen:bindings

# Build the application
yarn tauri:build
```

The built application will be in `src-tauri/target/release/bundle/`.

### Platform-Specific Notes

**macOS:**

- Builds for both Intel (`x86_64`) and Apple Silicon (`aarch64`) are supported
- Code signing may be required for distribution

**Linux:**

- Builds produce `.deb` and `.AppImage` packages
- Ensure all system dependencies are installed

**Windows:**

- Produces `.msi` installer
- WebView2 is bundled automatically

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Website**: [https://nexo.nkthanh.dev](https://nexo.nkthanh.dev)
- **Issues**: [GitHub Issues](https://github.com/magiskboy/nexo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/magiskboy/nexo/discussions)
- **Email**: [ask@nkthanh.dev](mailto:ask@nkthanh.dev)

---

<div align="center">
  <p>Made with ❤️ by the Nexo community</p>
  <p>
    <a href="https://github.com/magiskboy/nexo/stargazers">⭐ Star us on GitHub</a> •
    <a href="https://nexo.nkthanh.dev">🌐 Visit Website</a>
  </p>
</div>
