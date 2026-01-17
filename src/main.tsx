import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import './i18n/config';
import App from './App';
import { attachConsole } from '@tauri-apps/plugin-log';

// Attach console for Tauri logs
if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
  attachConsole().catch(console.error);
}

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
      maskAllInputs: true,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  tracePropagationTargets: ['localhost'],

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  environment: import.meta.env.MODE || 'development',
  enabled:
    import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true',

  // Privacy: scrub sensitive data
  beforeSend(event) {
    // Don't send events in development unless explicitly enabled
    if (import.meta.env.DEV && import.meta.env.VITE_SENTRY_ENABLED !== 'true') {
      return null;
    }

    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          const sanitizedData = { ...breadcrumb.data };
          // Redact API keys and sensitive fields
          if (sanitizedData.api_key) sanitizedData.api_key = '[REDACTED]';
          if (sanitizedData.apiKey) sanitizedData.apiKey = '[REDACTED]';
          if (sanitizedData.password) sanitizedData.password = '[REDACTED]';
          if (sanitizedData.token) sanitizedData.token = '[REDACTED]';
          breadcrumb.data = sanitizedData;
        }
        return breadcrumb;
      });
    }

    // Remove cookies and auth headers
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
    }

    return event;
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
