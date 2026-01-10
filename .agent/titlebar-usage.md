# Title Bar Text Management

## Overview

The title bar text is now managed through Redux state (`ui.titleBarText`), making it easy to update from anywhere in the application.

## How It Works

### 1. Redux State

```typescript
interface UIState {
  titleBarText: string | null; // Translation key or null
  // ... other state
}
```

### 2. Navigation Actions

Navigation actions automatically set the title bar text:

```typescript
// Navigate to chat - clears title bar text
dispatch(navigateToChat());

// Navigate to settings - sets title bar text to 'title' (Settings)
dispatch(navigateToSettings());

// Navigate to workspace settings - sets title bar text to 'workspaceSettings'
dispatch(navigateToWorkspaceSettings());
```

### 3. Manual Update

You can also manually update the title bar text:

```typescript
import { setTitleBarText } from '@/features/ui';

// Set custom title (translation key)
dispatch(setTitleBarText('myCustomTitle'));

// Clear title
dispatch(setTitleBarText(null));
```

### 4. Title Bar Component

The `MainLayout` component reads `titleBarText` from Redux and displays it:

```tsx
const titleBarText = useAppSelector((state) => state.ui.titleBarText);

<TitleBar
  leftContent={
    activePage === 'chat' ? (
      // Show workspace selector
    ) : titleBarText ? (
      <span className="text-sm font-medium text-foreground">
        {t(titleBarText, { ns: 'settings' })}
      </span>
    ) : null
  }
  onClose={
    titleBarText ? () => dispatch(navigateToChat()) : undefined
  }
/>
```

## Adding New Pages with Custom Title

To add a new page with a custom title bar:

1. **Create navigation action** (or update existing):

```typescript
navigateToMyPage: (state) => {
  state.activePage = 'myPage';
  state.titleBarText = 'myPageTitle'; // Translation key
};
```

2. **Add translation** in `src/i18n/locales/*/settings.json`:

```json
{
  "myPageTitle": "My Page Title"
}
```

3. **Done!** The title bar will automatically display your title.

## Features

- ✅ Centralized state management
- ✅ Automatic translation support
- ✅ ESC key support (when titleBarText is set, ESC navigates to chat)
- ✅ Close button behavior (when titleBarText is set, close button navigates to chat)
- ✅ Easy to extend for new pages

## Examples

### Example 1: App Settings

When user navigates to app settings:

1. `dispatch(navigateToSettings())` is called
2. Redux state updates:
   - `activePage = 'settings'`
   - `titleBarText = 'title'` (translates to "Settings" / "Cài đặt")
3. `MainLayout` reads state and displays title
4. User can:
   - Press ESC → navigates to chat
   - Click close button → navigates to chat

### Example 2: Workspace Settings

When user navigates to workspace settings:

1. `dispatch(navigateToWorkspaceSettings())` is called
2. Redux state updates:
   - `activePage = 'workspaceSettings'`
   - `titleBarText = 'workspaceSettings'`
3. `MainLayout` reads state and displays title
4. User can:
   - Press ESC → navigates to chat
   - Click close button → navigates to chat
   - Save settings → navigates to chat
