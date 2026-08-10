import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, errorInfo);
    Sentry.withScope((scope) => {
      scope.setTag('error.source', 'ErrorBoundary');
      scope.setExtras(errorInfo as unknown as Record<string, unknown>);
      Sentry.captureException(error);
    });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center" style={{ background: 'var(--surface-1)', color: 'var(--text-main)' }}>
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="max-w-md" style={{ color: 'var(--text-secondary)' }}>
            An unexpected error occurred. Please restart the application.
          </p>
          <pre className="text-xs p-4 rounded-md max-w-full overflow-auto" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
            {this.state.error?.message}
          </pre>
          <button
            className="px-4 py-2 rounded-md font-semibold"
            style={{ background: 'var(--accent)', color: 'white' }}
            onClick={() => window.location.reload()}
          >
            Restart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}