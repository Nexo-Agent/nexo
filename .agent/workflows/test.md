---
description: Create or update unit tests for a component or feature
---

1.  **Identify Target**:
    - Identify the component or function that needs testing.
    - Check if a corresponding `.test.tsx` or `.test.ts` file already exists in the same directory.

2.  **Setup Test File**:
    - If the test file doesn't exist, create it named `[OriginalName].test.tsx` (for UI) or `[OriginalName].test.ts` (for logic).
    - **Import Dependencies**:
      ```typescript
      import { describe, it, expect, vi, beforeEach } from 'vitest';
      import {
        render,
        screen,
        fireEvent,
        waitFor,
      } from '@testing-library/react';
      import userEvent from '@testing-library/user-event';
      // Import the component under test
      ```

3.  **Mocking Dependencies (Crucial)**:
    - **Icons**: Mock `lucide-react` if used.
      ```typescript
      vi.mock('lucide-react', () => ({
        IconName: () => <div data-testid="icon-name" />,
      }));
      ```
    - **Tauri/Backend**: Mock `@/lib/tauri` or `invokeCommand` if the component calls backend functions.
    - **Redux/State**:
      - If the component uses `useSelector` or `useDispatch`, wrap the rendered component in a Redux `<Provider>` with a mock store.
      - Mock RTK Query hooks if data fetching is involved (e.g., `useGetSomethingQuery`).
    - **Hooks**: Mock custom hooks to control return values (e.g., `useAppSettings`, `useTranslation`).
      ```typescript
      vi.mock('@/hooks/useMyHook', () => ({
        useMyHook: () => ({ someValue: true }),
      }));
      ```

4.  **Write Test Cases**:
    Structure your `describe` block into logical sections:
    - **Rendering**:
      - specific elements exist (`toBeInTheDocument`).
      - Text content is correct.
      - Snapshots match (`toMatchSnapshot`).
    - **Interactive Behavior**:
      - Click handling (`await user.click(...)`).
      - Input handling (`await user.type(...)`).
      - Form submission.
    - **Conditional States**:
      - Loading states (spinners visible?).
      - Error states (error messages visible?).
      - Empty states.
    - **Edge Cases**:
      - Null/undefined props.
      - Network failures (mock rejected promises).

5.  **Run and Verify**:
    - // turbo
    - Run the specific test file to save time:
      `yarn vitest run relative/path/to/file.test.tsx`
    - Analyze failures. If a snapshot fails and the change is intentional, run with `-u` to update.

6.  **Refine**:
    - Resolve any `act(...)` warnings by ensuring async operations are properly awaited.
    - Fix linting errors in the test file.
    - Ensure assertions are specific (avoid broad matching like `getByRole('button')` if multiple exist; use `name` option).

7.  **Final Polish**:
    - Run the full test suite or `yarn test` to ensure no regressions.
