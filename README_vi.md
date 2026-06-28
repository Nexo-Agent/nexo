<p align="center">
  <img width="420" alt="Cogito Studio" src="public/horizontal-logo.svg">
</p>

<h1 align="center">Cogito Studio</h1>

<p align="center">
  Không gian làm việc AI local-first, đa nền tảng, dành cho những người cần nhiều hơn một khung chat đơn giản.
</p>

<p align="center">
  Dùng OpenAI, Anthropic, Google Gemini, Ollama, OpenRouter, Groq và nhiều nhà cung cấp khác trong một ứng dụng desktop.
  Kết nối MCP tools, giữ toàn quyền kiểm soát dữ liệu, và xây dựng workflow đúng với cách bạn làm việc.
</p>

<div align="center">

[![publish](https://github.com/CogitoForge-AI/cogito-studio/actions/workflows/build.yaml/badge.svg)](https://github.com/CogitoForge-AI/cogito-studio/actions/workflows/build.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

<p align="center">
  <a href="https://studio.cogito-ai.org">Website</a>
  ·
  <a href="https://github.com/CogitoForge-AI/cogito-studio/releases">Tải xuống</a>
  ·
  <a href="https://github.com/CogitoForge-AI/cogito-studio/issues">Báo lỗi</a>
  ·
  <a href="https://github.com/CogitoForge-AI/cogito-studio">Star trên GitHub</a>
</p>

## Vì sao là Cogito Studio

Phần lớn ứng dụng AI desktop hiện nay buộc bạn chọn một provider duy nhất, phụ thuộc vào dịch vụ hosted, hoặc chỉ xoay quanh trải nghiệm chat cơ bản.
Cogito Studio đi theo hướng khác:

- **Dùng mô hình theo cách bạn muốn** với hỗ trợ cho cả provider cloud và local.
- **Giữ quyền kiểm soát** với dữ liệu lưu cục bộ và API key do chính bạn quản lý.
- **Mở rộng ứng dụng** bằng MCP server và custom tools.
- **Làm việc trong một nơi duy nhất** với chat, notes, browser experience và file artifacts.
- **Tránh vendor lock-in** để bạn dễ thay đổi provider theo chất lượng, chi phí hoặc độ trễ.

## Bạn có thể làm gì

- Kết nối nhiều LLM provider trong cùng một desktop workspace.
- Dùng backend hosted hoặc local tùy vào ngân sách, nhu cầu riêng tư và hiệu năng.
- Gắn MCP server để cho assistant truy cập tools, API, file và hệ thống bên ngoài.
- Tạo artifact độc lập và xem trước ngay trong ứng dụng.
- Làm việc với Markdown, code block, công thức toán và nội dung HTML phong phú.
- Sử dụng các tính năng sẵn có như notes, browser flows và cấu hình theo từng provider.
- Lưu hội thoại và dữ liệu ứng dụng cục bộ thay vì phụ thuộc vào tài khoản cloud bắt buộc.

## Các provider được hỗ trợ

Cogito Studio hiện có luồng thiết lập trực tiếp cho:

- OpenAI
- Anthropic Claude
- Google Gemini
- Ollama
- vLLM
- LiteLLM
- OpenRouter
- Groq
- Together AI
- Fireworks AI
- DeepInfra
- Các endpoint tương thích OpenAI như gateway tùy chỉnh hoặc dịch vụ self-hosted

Điều này cho phép bạn so sánh chất lượng mô hình, chi phí, tốc độ và mức độ riêng tư mà không cần đổi ứng dụng.

## Dành cho ai

Cogito Studio đặc biệt phù hợp với:

- Developer muốn thử prompt và tool trên nhiều model provider
- Power user cần một desktop AI workspace nghiêm túc thay vì chỉ dùng web chat
- Researcher và technical writer làm việc nhiều với Markdown, notes và structured output
- Builder đang thử nghiệm MCP và các tích hợp tool tùy chỉnh
- Team muốn sự linh hoạt mà không bị khóa vào một AI vendor duy nhất

## Bắt đầu nhanh

1. Cài đặt Cogito Studio cho nền tảng của bạn.
2. Thêm API key cho provider cloud hoặc kết nối provider local như Ollama.
3. Bắt đầu một cuộc trò chuyện và chuyển đổi giữa các provider khi cần.
4. Kết nối MCP server để mở khóa tool bên ngoài và workflow automation.
5. Tạo artifact, notes và browser-assisted flows trong cùng một workspace.

## Cài đặt

### macOS

```bash
bash <(curl -fsSL https://studio.cogito-ai.org/installer.sh)
```

### Linux

```bash
bash <(curl -fsSL https://studio.cogito-ai.org/installer.sh)
```

### Windows

```powershell
& ([ScriptBlock]::Create((iwr -useb https://studio.cogito-ai.org/installer-windows.ps1)))
```

Bạn cũng có thể tải các bản phát hành đóng gói sẵn tại [GitHub Releases](https://github.com/CogitoForge-AI/cogito-studio/releases).

## Ảnh minh họa

### Workspace đa provider

![Thiết lập đa provider trong Cogito Studio](docs/screenshots/Variance%20LLM%20providers.png)

### Render Markdown kỹ thuật và công thức toán

![Artifact Markdown với LaTeX trong Cogito Studio](docs/screenshots/Markdown%20artifact%20-%20Latex%20render%20for%20scientific.png)

### Workflow artifact trực quan và HTML

![Xem trước HTML artifact trong Cogito Studio](docs/screenshots/HTML%20artifact%20-%20Visualbility.png)

## Vì sao người dùng sẽ star dự án này

Người dùng thường star một dự án khi họ muốn:

- Theo dõi tiến độ phát triển và các bản phát hành mới
- Ủng hộ một giải pháp open-source mạnh trong mảng AI tools
- Lưu lại để thử sau
- Thể hiện sự quan tâm với local-first, privacy-first và vendor-neutral tooling

Nếu Cogito Studio phù hợp với hướng bạn đang tìm kiếm, một ngôi sao sẽ giúp nhiều người khác biết đến dự án hơn.

## Local-First ngay từ thiết kế

Cogito Studio được xây dựng cho những người quan tâm đến quyền sở hữu và kiểm soát:

- Hội thoại được lưu cục bộ
- Bạn tự quản lý thông tin xác thực của provider
- Bạn có thể dùng model local khi phù hợp
- Bạn có thể mở rộng khả năng bằng MCP thay vì chờ roadmap của một nền tảng đóng

## Đóng góp

Mọi đóng góp đều được chào đón.
Nếu bạn muốn cải thiện ứng dụng, thêm integration, tinh chỉnh UX hoặc tăng độ ổn định đa nền tảng, hãy bắt đầu tại đây:

- [Hướng dẫn đóng góp](CONTRIBUTING.md)
- [Hướng dẫn phát triển](DEVELOPMENT.md)
- [Issues](https://github.com/CogitoForge-AI/cogito-studio/issues)

## Giấy phép

Cogito Studio được phát hành theo giấy phép [MIT](LICENSE).
