# Browser Webview Integration

Nexo embeds a native browser using **Tauri 2 child webviews** (WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux). Browser state is **app-scoped**: tabs persist across chats and screens until the user closes them.

## Architecture

```
Nexo (Tauri 2 + React)
  ├── BrowserProvider (React) — global tab state, event subscriptions
  ├── BrowserView / BrowserPanel — panel consumer (refs WF, does not own tabs)
  ├── BrowserFence — message-scoped fence tabs via WF
  └── Rust WebviewFactory (singleton in AppState)
        ├── WebviewRegistry — panel tabs + fence tabs
        ├── ViewportLeaseManager — main_panel / fence viewports
        └── PlatformChildWebviewStrategy — parent WK config (macOS)
```

## Tab kinds

| Kind  | Persist        | Closed when                                             |
| ----- | -------------- | ------------------------------------------------------- |
| Panel | App-wide       | User closes tab in tab bar                              |
| Fence | Message anchor | Conversation switch, fence unmount, `release_fence_tab` |

One **panel tab = one child webview** (`browser-{tab_id}`).

## Core flow (panel)

1. `browser_create_tab` creates a hidden child webview on window `main`.
2. `BrowserWebviewHost` reports `getBoundingClientRect()` via `browser_sync_bounds` (`viewport: main_panel`).
3. Rust positions/shows the active tab's webview over the React placeholder.
4. Switching tabs calls `browser_set_active_tab` and toggles bounds visibility — **no navigate**.
5. Unmounting the panel calls `browser_release_viewport` — tabs remain in WF.

## Tauri commands

| Command                                                                   | Purpose                                 |
| ------------------------------------------------------------------------- | --------------------------------------- |
| `browser_create_tab`                                                      | New panel tab                           |
| `browser_destroy_tab`                                                     | User closes panel tab                   |
| `browser_list_tabs` / `browser_get_active_tab` / `browser_set_active_tab` | Tab bar state                           |
| `browser_create_fence_tab` / `browser_release_fence_tab`                  | Fence embed                             |
| `browser_release_fences_for_chat`                                         | Cleanup on conversation switch          |
| `browser_sync_bounds` / `browser_release_viewport`                        | Viewport lease + position               |
| `browser_navigate` / `go_back` / `go_forward` / `reload`                  | Navigation (`tab_id` optional → active) |

## AI tools

Target the **active panel tab** app-wide (`browser_navigate` creates a tab if none exists).

## Platform notes

- Requires `tauri` feature `unstable` for `WebviewBuilder` + `add_child`.
- macOS: child webviews share parent `WKWebViewConfiguration` (cached at app setup).
- Linux: child webviews use `related_view` from main webview.
