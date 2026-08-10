import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { initBrowserSentry } from './lib/sentry';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';
import App from './App';
import './index.css';

initBrowserSentry();

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