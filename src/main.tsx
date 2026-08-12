import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { initBrowserSentry } from './lib/sentry';
import { initTelemetry, track } from './utils/telemetry';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';
import App from './App';
import './index.css';

initBrowserSentry();

initTelemetry({
  appName: 'surfdock',
  appVersion: '1.0.3',
});

const root = document.getElementById('root')!;

if (root.hasChildNodes()) {
  ReactDOM.hydrateRoot(
    root,
    <React.StrictMode>
      <Sentry.ErrorBoundary fallback={<ErrorBoundary />}>
        <ErrorBoundary>
          <ThemeProvider>
            <LanguageProvider>
              <App />
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </Sentry.ErrorBoundary>
    </React.StrictMode>
  );
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Sentry.ErrorBoundary fallback={<ErrorBoundary />}>
        <ErrorBoundary>
          <ThemeProvider>
            <LanguageProvider>
              <App />
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </Sentry.ErrorBoundary>
    </React.StrictMode>
  );
}

track({ type: 'SESSION', payload: { action: 'app_start', version: '1.0.3' } });