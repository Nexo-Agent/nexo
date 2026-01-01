# Security Policy

## Supported Versions

Only the latest stable release and the current `main` branch are supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Nexo, please **DO NOT** open a public issue.
Instead, please email us at [ask@nkthanh.dev](mailto:ask@nkthanh.dev) with the subject "Nexo Security Vulnerability".

We will acknowledge your email within 48 hours and provide an estimated timeline for a fix.

## Security Features & Best Practices

### 1. Data Privacy (Local First)

Nexo is designed to be local-first.

- **Database**: All chat history and embeddings are stored in a local SQLite database file on your machine.
- **API Keys**: LLM API keys are stored in your local configuration (verify encryption status in settings).
- **Telemetry**: Nexo currently does **not** collect telemetry data.

### 2. Code Execution (Sandboxing)

Nexo allows running Python and Node.js code snippets via its runtime.

- **Warning**: These runtimes execute code on your local machine. While we aim to sandbox these environments, **never execute code from untrusted sources** or code that you do not understand.
- **Network Access**: Be aware that code running in the agent environment may have network access depending on your system configuration.

### 3. MCP (Model Context Protocol)

- **Permissions**: When connecting to an MCP server, you are granting the AI agent access to the tools exposed by that server. Grant access only to trusted servers.

### 4. WebView Security

- We enforce strict **Content Security Policy (CSP)** where possible.
- `external` links are always opened in the default OS browser, not within the application shell.
