# Chromium Browser Integration — Phương án A

Tài liệu kỹ thuật cho tích hợp trình duyệt Chromium headless vào Nexo qua CDP (Chrome DevTools Protocol).

## Kiến trúc

```
Nexo (Tauri 2 + React)
  ├── React UI — BrowserStreamView (frames + input)
  ├── Rust BrowserService — session lifecycle, CDP bridge
  └── chrome-headless-shell (tiến trình riêng, tải lần đầu chạy app)
        └── CDP WebSocket (127.0.0.1 only)
```

**Phân phối Chromium:** Không bundle vào installer. Tải `chrome-headless-shell` từ Chrome for Testing API lần đầu chạy Nexo, lưu tại `$APPDATA/chromium-runtime/{version}/`.

## CDP cốt lõi

| Hướng        | API                                                              |
| ------------ | ---------------------------------------------------------------- |
| Stream UI    | `Page.startScreencast` → `Page.screencastFrame` (JPEG base64)    |
| ACK bắt buộc | `Page.screencastFrameAck` — không ACK thì Chrome ngừng gửi frame |
| Click/drag   | `Input.dispatchMouseEvent`                                       |
| Keyboard     | `Input.dispatchKeyEvent`, `Input.insertText`                     |
| Navigate     | `Page.navigate`                                                  |

## So sánh phương pháp

| Phương pháp                      | Phù hợp Nexo | Ghi chú                                    |
| -------------------------------- | ------------ | ------------------------------------------ |
| **A: Rust CDP Bridge** (đã chọn) | Rất tốt      | Sidecar runtime download, chromiumoxide    |
| B: CDP + WebRTC                  | Phase 3+     | Latency thấp hơn, phức tạp                 |
| C: CEF embed                     | Không        | Fork Tauri runtime, ~300MB                 |
| D: Node/Playwright sidecar       | Tạm          | agent-browser đã có, thay bằng Rust native |
| E: noVNC/Xvfb                    | Không        | Linux-only, latency cao                    |
| F: Hosted (Browserbase)          | Optional     | Cloud dependency                           |

## Khả năng render

| Loại                    | Hỗ trợ               | Ghi chú                      |
| ----------------------- | -------------------- | ---------------------------- |
| HTML/CSS/JS, SPA        | Tốt                  | Full Chromium                |
| PDF inline / printToPDF | Tốt                  | PDFium                       |
| Video `<video>`         | Hạn chế              | Headless codec limits        |
| Audio                   | Không qua screencast | Cần PulseAudio capture riêng |
| WebGL/Canvas            | Tốt                  | GPU flags                    |

## Rủi ro

- `screencastFrameAck` — ACK ngay trong task riêng
- Download ~150MB lần đầu — progress UI + retry
- CDP port chỉ `127.0.0.1`
- Session idle TTL 5 phút
- URL allowlist: `http`, `https`, `file` only

## Phase roadmap

1. **Phase 1:** ChromeRuntimeInstaller + BrowserService + BrowserStreamView
2. **Phase 2a:** ` ```browser url``` ` fence trong chat
3. **Phase 2b:** AI tools (navigate, click, type, screenshot, get_content)
4. **Phase 2c:** Mở artifact HTML trong browser
5. **Phase 2d:** Browser panel thủ công (ChatRightPanel tab)
