import type {
  Breadcrumb,
  BrowserOptions,
  ExclusiveEventHintOrCaptureContext,
  ReportDialogOptions,
  User,
} from '@sentry/browser';

type SentryClient = typeof import('@/lib/sentry-browser-client');
type BeforeSendEvent = Parameters<NonNullable<BrowserOptions['beforeSend']>>[0];

let sentryPromise: Promise<SentryClient | null> | null = null;
let initScheduled = false;

function isEnabled() {
  return import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true';
}

function sanitizeEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (import.meta.env.DEV && import.meta.env.VITE_SENTRY_ENABLED !== 'true') {
    return null;
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
      if (breadcrumb.data) {
        const sanitizedData = { ...breadcrumb.data };
        if (sanitizedData.api_key) sanitizedData.api_key = '[REDACTED]';
        if (sanitizedData.apiKey) sanitizedData.apiKey = '[REDACTED]';
        if (sanitizedData.password) sanitizedData.password = '[REDACTED]';
        if (sanitizedData.token) sanitizedData.token = '[REDACTED]';
        breadcrumb.data = sanitizedData;
      }
      return breadcrumb;
    });
  }

  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }
  }

  return event;
}

async function loadSentry() {
  if (!isEnabled()) return null;

  if (!sentryPromise) {
    sentryPromise = import('@/lib/sentry-browser-client')
      .then((client) => {
        const options = {
          dsn: import.meta.env.VITE_SENTRY_DSN,
          tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
          tracePropagationTargets: ['localhost'],
          environment: import.meta.env.MODE || 'development',
          enabled: isEnabled(),
          beforeSend: sanitizeEvent,
        } satisfies BrowserOptions;

        client.initBrowserSentry(options);

        return client;
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error('Failed to load Sentry:', error);
        }
        sentryPromise = null;
        return null;
      });
  }

  return sentryPromise;
}

function withSentry(callback: (client: SentryClient) => void) {
  void loadSentry().then((client) => {
    if (client) callback(client);
  });
}

export function scheduleSentryInit() {
  if (initScheduled || !isEnabled()) return;
  initScheduled = true;

  const init = () => {
    void loadSentry();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(init, { timeout: 3000 });
    return;
  }

  globalThis.setTimeout(init, 0);
}

export function addBreadcrumb(breadcrumb: Breadcrumb) {
  withSentry((sentry) => sentry.addBreadcrumb(breadcrumb));
}

export function setTag(key: string, value: string) {
  withSentry((sentry) => sentry.setTag(key, value));
}

export function setContext(key: string, context: Record<string, unknown>) {
  withSentry((sentry) => sentry.setContext(key, context));
}

export function setUser(user: User | null) {
  withSentry((sentry) => sentry.setUser(user));
}

export function captureMessage(
  message: string,
  captureContext?: ExclusiveEventHintOrCaptureContext
) {
  withSentry((sentry) => sentry.captureMessage(message, captureContext));
}

export async function captureException(
  exception: unknown,
  captureContext?: ExclusiveEventHintOrCaptureContext
) {
  const sentry = await loadSentry();
  return sentry?.captureException(exception, captureContext) ?? null;
}

export function showReportDialog(options: ReportDialogOptions) {
  withSentry((sentry) => sentry.showReportDialog(options));
}
