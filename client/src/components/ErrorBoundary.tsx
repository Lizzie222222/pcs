import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { isChunkLoadError } from '@/lib/chunkErrorDetection';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    const isChunk = isChunkLoadError(error);
    
    this.setState({
      error,
      errorInfo,
      isChunkError: isChunk,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to monitoring service in production
    if (import.meta.env.PROD) {
      console.error('Production error:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        isChunkLoadError: isChunk,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkError: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Show different UI for chunk load errors vs regular errors
      const isChunk = this.state.isChunkError;
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" data-testid="error-boundary-fallback">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isChunk ? 'Update Required' : 'Something went wrong'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isChunk 
                ? 'The application has been updated. Please reload the page to get the latest version.'
                : "We're sorry for the inconvenience. The page encountered an unexpected error."
              }
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                  Error details (dev only)
                </summary>
                <div className="bg-gray-100 rounded p-3 text-xs font-mono overflow-auto max-h-48">
                  <div className="text-red-600 mb-2">{this.state.error.toString()}</div>
                  {this.state.errorInfo && (
                    <pre className="text-gray-600 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              {isChunk ? (
                <>
                  <Button
                    onClick={this.handleReload}
                    className="gap-2"
                    data-testid="button-reload-page"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                    className="gap-2"
                    data-testid="button-home"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={this.handleReset}
                    variant="outline"
                    className="gap-2"
                    data-testid="button-retry"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/'}
                    data-testid="button-home"
                  >
                    Go to homepage
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
