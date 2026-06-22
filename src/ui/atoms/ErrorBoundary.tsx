import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/ui/atoms/button/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';
import { captureException, showReportDialog } from '@/lib/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    eventId: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, eventId: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error bound by ErrorBoundary:', {
      error,
      errorInfo,
    });

    void captureException(error, {
      level: 'error',
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    }).then((eventId) => {
      if (eventId) {
        this.setState({ eventId });
      }
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReportFeedback = () => {
    if (this.state.eventId) {
      showReportDialog({
        eventId: this.state.eventId,
        title: 'Report Error',
        subtitle: 'Help us improve by reporting this error',
        subtitle2: 'Our team will be notified.',
      });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 mb-6">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md mb-8">
            An unexpected error occurred. We&apos;ve logged this issue and will
            fix it soon.
          </p>

          {this.state.error && (
            <div className="w-full max-w-md bg-muted/50 rounded-lg p-4 mb-8 text-left overflow-auto max-h-48">
              <code className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                {this.state.error.toString()}
              </code>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="size-4" />
              Reload Application
            </Button>
            {this.state.eventId && (
              <Button
                onClick={this.handleReportFeedback}
                variant="outline"
                className="gap-2"
              >
                <AlertCircle className="size-4" />
                Report Issue
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
