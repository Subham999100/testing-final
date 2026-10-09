import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] w-full p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-danger-soft border border-danger flex items-center justify-center text-danger mb-4">
            <AlertCircle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-ink mb-2">Something went wrong</h2>
          <p className="text-sm text-muted max-w-md mb-6">
            {this.state.error?.message || this.props.fallbackMessage || 'An unexpected error occurred while displaying this section.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="button button-primary button-small flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="button button-secondary button-small"
            >
              Reload application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
