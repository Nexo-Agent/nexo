import {
  addBreadcrumb,
  browserTracingIntegration,
  captureException,
  captureMessage,
  init,
  setContext,
  setTag,
  setUser,
  showReportDialog,
} from '@sentry/browser';
import type { BrowserOptions } from '@sentry/browser';

export function initBrowserSentry(options: BrowserOptions) {
  init({
    ...options,
    integrations: [browserTracingIntegration()],
  });
}

export {
  addBreadcrumb,
  captureException,
  captureMessage,
  setContext,
  setTag,
  setUser,
  showReportDialog,
};
