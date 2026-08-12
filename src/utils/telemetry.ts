// RMY GENOME — Unified Telemetry SDK
// Progetto: SurfDock

export type BaseEventType = 'UI_ERROR' | 'API_ERROR' | 'WS_ERROR' | 'PERF' | 'SESSION' | 'RATE_LIMIT' | 'CREDIT_EXHAUSTION';

export interface TelemetryEvent<T extends string = BaseEventType> {
  type: T;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface TelemetryConfig {
  appName: string;
  appVersion: string;
  maxBuffer: number;
  flushIntervalMs: number;
  endpoint: string;
  sentryDsn?: string;
  sentryInit?: () => Promise<void>;
}

let config: TelemetryConfig = {
  appName: 'surfdock',
  appVersion: '1.0.3',
  maxBuffer: 50,
  flushIntervalMs: 30000,
  endpoint: '/api/telemetry',
};

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sentryReady = false;

export function initTelemetry(cfg: Partial<TelemetryConfig>): void {
  config = { ...config, ...cfg };
  if (config.sentryDsn && config.sentryInit) {
    config.sentryInit().then(() => { sentryReady = true; }).catch(() => {});
  }
}

export function track<T extends string = BaseEventType>(event: Omit<TelemetryEvent<T>, 'timestamp'>): void {
  const entry: TelemetryEvent<T> = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  console.info(`[${config.appName}_TELEMETRY]`, JSON.stringify(entry));

  try {
    const key = `${config.appName}_telemetry`;
    const existing = JSON.parse(sessionStorage.getItem(key) || '[]');
    existing.push(entry);
    if (existing.length > config.maxBuffer) existing.shift();
    sessionStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // sessionStorage not available
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => { flush(); flushTimer = null; }, config.flushIntervalMs);
  }
}

async function flush(): Promise<void> {
  try {
    const buffer = getTelemetryBuffer();
    if (buffer.length === 0) return;
    clearTelemetry();
    await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: buffer }),
    }).catch(() => {});
  } catch {}
}

export function getTelemetryBuffer(): TelemetryEvent[] {
  try {
    const key = `${config.appName}_telemetry`;
    return JSON.parse(sessionStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

export function clearTelemetry(): void {
  try {
    const key = `${config.appName}_telemetry`;
    sessionStorage.removeItem(key);
  } catch {}
}

export function trackLatency(metric: string, durationMs: number, extra?: Record<string, unknown>): void {
  track({
    type: 'PERF' as BaseEventType,
    payload: { metric, durationMs, exceedsThreshold: durationMs > 3000, ...extra },
  });
}

export function trackRateLimit(endpoint: string): void {
  track({
    type: 'RATE_LIMIT' as BaseEventType,
    payload: { endpoint },
  });
}
