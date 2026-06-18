---
description: Tauri v2 capabilities/permissions model, plugin wiring, and app config/versioning notes
---

# Capabilities & Config (Tauri v2)

Tauri v2 gates every plugin/core API behind **capabilities** — there is no
v1-style allowlist. If a frontend call fails with a permission error, the fix is
almost always in the capabilities file, not in code. Example:
[assets/config/capabilities.json](../assets/config/capabilities.json).

## Capabilities file

`src-tauri/capabilities/*.json` grants permissions to one or more windows. A
permission is either a string id (`"clipboard-manager:default"`) or an object with
a **scoped allow-list** of paths.

```jsonc
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-maximize",
    "opener:default",
    {
      "identifier": "opener:allow-open-path",
      "allow": [{ "path": "$HOME/Downloads" }, { "path": "$APPDATA/files/**" }],
    },
    "clipboard-manager:default",
    "dialog:default",
    {
      "identifier": "fs:allow-read-text-file",
      "allow": [{ "path": "$APPDATA/cache/**" }],
    },
    "fs:default",
    // ...updater:allow-*, process:allow-restart, log:default
  ],
}
```

Conventions:

- **Path variables** (`$APPDATA`, `$HOME`, `$DOWNLOAD`, …) resolve per-platform at
  runtime. Use them — never hardcode absolute paths.
- **Scope tightly.** Restrict filesystem access to specific subtrees rather than
  granting broad access. When a feature needs a new path, add a narrowly-scoped
  allow entry.
- A permission must be granted here **and** the matching plugin initialized in
  `lib.rs` (`.plugin(tauri_plugin_*::init())`) for the API to work.

> Common failure mode: a JS plugin call throws a permission error even though the
> npm package is installed — because the capability wasn't granted. Add the
> permission id to the capabilities file.

## Plugins

Initialize each plugin in `src-tauri/src/lib.rs` (Rust) and install the matching
`@tauri-apps/plugin-*` npm package on the frontend. Typical desktop set: `log`,
`opener`, `dialog`, `fs`, `clipboard-manager`, `updater`, `process`.

When adding a plugin: add the Cargo dependency + `.plugin(...)` in `lib.rs`, the
`@tauri-apps/plugin-*` npm package, **and** the capability permission.

## App config & versioning

`src-tauri/tauri.conf.json` holds `productName`, `identifier`, `version`,
`build.devUrl`, `build.frontendDist`, and `bundle.targets`.

**Keep the version in sync** across `tauri.conf.json`, `package.json`, and
`src-tauri/Cargo.toml`. Note: the **Windows MSI** target requires a numeric-only
version under `bundle.windows.wix.version` (no pre-release suffix like
`-beta.N`), so pre-release builds need a numeric mapping. See the release
procedure in [workflow-release.md](workflow-release.md) rather than bumping
versions by hand.
