import { TourSteps } from './types';

export const ONBOARDING_STEPS: TourSteps = {
  welcomeFlow: [
    {
      target: 'body',
      content:
        'Chào mừng bạn đến với Nexo! Đây là ứng dụng AI Agent mạnh mẽ giúp bạn lập trình nhanh hơn. Hãy bắt đầu với việc thiết lập cơ bản.',
      placement: 'center',
      disableBeacon: true,
    },
    // Step 1: Config LLM
    {
      target: '[data-tour="settings-nav"]',
      content:
        'Đầu tiên, hãy vào phần Cài đặt (Settings) để kết nối với các mô hình AI. Bạn có thể nhấn vào nút Settings hoặc nhấn nút Next để tiếp tục.',
      spotlightPadding: 5,
      spotlightClicks: true,
      data: {
        onNextAction: 'OPEN_SETTINGS',
      },
      disableOverlayClose: true,
    },
    {
      target: '[data-tour="settings-llm-tab"]',
      content: 'Chọn tab "LLM Connections" để quản lý các kết nối AI.',
      spotlightClicks: true,
      data: {
        onNextAction: 'OPEN_LLM_TAB',
      },
      disableOverlayClose: true,
    },
    {
      target: '[data-tour="llm-add-btn"]',
      content: 'Nhấn Next để mở hộp thoại thêm kết nối mới.',
      spotlightClicks: true,
      disableOverlayClose: true,
      data: {
        onNextAction: 'CLICK_ADD_CONNECTION',
      },
      hideFooter: false,
    },
    {
      target: '[data-tour="llm-name-input"]',
      content: 'Đặt tên cho kết nối LLM (ví dụ: My OpenAI).',
      disableOverlayClose: true,
      spotlightClicks: true,
      disableBeacon: true,
      disableScrolling: true,
    },
    {
      target: '[data-tour="llm-provider-select"]',
      content: 'Chọn nhà cung cấp dịch vụ AI (ví dụ: OpenAI).',
      disableOverlayClose: true,
      spotlightClicks: true,
      disableBeacon: true,
      disableScrolling: true,
    },
    {
      target: '[data-tour="llm-api-key-input"]',
      content: 'Nhập API Key của bạn.',
      disableOverlayClose: true,
      spotlightClicks: true,
      disableBeacon: true,
      disableScrolling: true,
    },
    {
      target: '[data-tour="llm-save-btn"]',
      content: 'Nhấn Next để lưu và đóng.',
      disableOverlayClose: true,
      data: {
        onNextAction: 'CLICK_SAVE_CONNECTION',
      },
    },
    // Step 2: Create Workspace
    {
      target: '[data-tour="workspace-selector"]',
      content:
        'Tiếp theo, hãy tạo không gian làm việc (Workspace). Workspace giúp Agent hiểu ngữ cảnh dự án của bạn.',
      data: {
        onNextAction: 'CLOSE_SETTINGS',
      },
      disableOverlayClose: true,
    },
    {
      target: '[data-tour="workspace-name-input"]',
      content: 'Đặt tên cho Workspace mới của bạn.',
      disableOverlayClose: true,
    },
    {
      target: '[data-tour="workspace-add-btn"]',
      content: 'Nhấn Next để tạo Workspace.',
      disableOverlayClose: true,
      spotlightClicks: true,
      data: {
        onNextAction: 'CLICK_WORKSPACE_ADD',
      },
      hideFooter: false,
    },
    // Step 3: Start Chatting
    {
      target: '[data-tour="model-selector"]',
      content:
        'Bây giờ bạn đã sẵn sàng! Hãy chọn mô hình AI mà bạn vừa kết nối ở đây.',
      disableOverlayClose: true,
    },
    {
      target: '[data-tour="chat-input-textarea"]',
      content:
        'Nhập câu hỏi hoặc yêu cầu của bạn, ví dụ: "Hãy giải thích cấu trúc dự án này".',
      disableOverlayClose: true,
    },
    {
      target: '[data-tour="send-message-btn"]',
      content: 'Nhấn gửi và xem Agent làm việc phép màu! ✨',
      disableOverlayClose: true,
    },
  ],
  agentActionFlow: [],
  communityToolFlow: [],
};
