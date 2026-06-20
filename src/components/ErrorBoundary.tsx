import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  declare props: Props;  // 解决 useDefineForClassFields: false 下 this.props 不识别
  state = { hasError: false, error: null as Error | null, showDetails: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[bunkdesk] Uncaught error:', error, errorInfo);
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-modal">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-3xl">
              ⚠️
            </div>
            <h1 className="mb-2 text-xl font-bold text-foreground">
              出错了 / Something went wrong
            </h1>
            <p className="mb-1 text-sm text-muted-foreground">
              应用遇到意外错误，请尝试刷新页面。
            </p>
            <p className="mb-6 text-xs text-muted-foreground">
              An unexpected error occurred. Please try refreshing the page.
            </p>

            {/* 错误详情默认折叠，避免泄露技术细节 — 点击刷新即可 */}
            {this.state.error && (
              <details className="mb-6">
                <summary className="text-xs text-muted-foreground underline hover:text-foreground transition cursor-pointer">
                  查看详情 / Show details
                </summary>
                <pre className="mt-3 rounded-lg bg-muted p-3 text-left font-mono text-xs text-muted-foreground overflow-x-auto max-h-40 overflow-y-auto">
                  {this.state.error.message}
                  {this.state.error.stack && '\n\n' + this.state.error.stack}
                </pre>
              </details>
            )}

            <button
              onClick={() => this.handleReload()}
              className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-medium text-brand-foreground transition hover:opacity-90 min-h-[44px]"
            >
              刷新页面 / Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
