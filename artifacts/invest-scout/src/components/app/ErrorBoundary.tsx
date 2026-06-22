import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * App-wide error boundary. Catches render-time crashes anywhere in the tree
 * and shows a calm, on-brand recovery screen instead of a white page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Vertica
          </p>
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            An unexpected error interrupted this page. Your data is safe — try
            reloading to continue.
          </p>

          {import.meta.env.DEV && this.state.error ? (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-left text-xs text-destructive">
              {this.state.error.message}
            </pre>
          ) : null}

          <div className="mt-6 flex justify-center">
            <Button onClick={this.handleReload}>Reload page</Button>
          </div>
        </div>
      </div>
    );
  }
}
