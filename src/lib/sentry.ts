import * as Sentry from "@sentry/react";

export function initBrowserSentry(config?: { dsn?: string; environment?: string }): boolean {
  const dsn = config?.dsn || import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn("[Sentry] VITE_SENTRY_DSN non configurato. Browser monitoring disabilitato.");
    return false;
  }
  Sentry.init({
    dsn,
    environment: config?.environment || import.meta.env.MODE || "development",
    release: __APP_VERSION__,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.user?.email) event.user.email = event.user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
      return event;
    },
    ignoreErrors: [
      'ResizeObserver loop',
      'Network request failed',
      'Failed to fetch',
      'AbortError',
      /^Loading chunk \d+ failed/,
    ],
  });
  Sentry.setTags({ app: 'surfdock', version: __APP_VERSION__ || 'unknown' });
  return true;
}

export function captureBrowserError(error: unknown, context?: Record<string, unknown>): void {
  const errObj = error instanceof Error ? error : new Error(String(error));
  console.error("[Captured Error]", errObj, context);
  try {
    Sentry.withScope((scope) => {
      scope.setTag('error.source', 'captureBrowserError');
      if (context) scope.setExtras(context);
      Sentry.captureException(errObj);
    });
  } catch (sdkErr) {
    console.error("[Sentry Fallback]", sdkErr);
  }
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>, category = 'manual'): void {
  try {
    Sentry.addBreadcrumb({ category, message, level: 'info', data, timestamp: Date.now() / 1000 });
  } catch {}
}