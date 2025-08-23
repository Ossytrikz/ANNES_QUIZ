import { Component, ErrorInfo, ReactNode, ReactElement, ComponentType } from 'react';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: { error: Error | null; resetErrorBoundary: () => void }) => ReactElement;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    const { hasError, error } = this.state;
    const { fallback } = this.props;
    
    if (hasError) {
      if (fallback) {
        return fallback({ 
          error,
          resetErrorBoundary: this.handleReset 
        });
      }
      
      return (
        <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
          <h1 className="mb-4 text-2xl font-bold text-destructive">
            Something went wrong
          </h1>
          <p className="mb-6 text-muted-foreground">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button 
            onClick={this.handleReset}
            variant="outline"
            className="px-4 py-2"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const withErrorBoundary = <P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
): ComponentType<P> => {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary 
      fallback={({ resetErrorBoundary }) => (
        <>
          {fallback}
          <button onClick={resetErrorBoundary}>Try again</button>
        </>
      )} 
      onError={onError}
    >
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};
