'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  error: Error | null;
}

/**
 * Last-resort error boundary for client-side render errors. Operational
 * surfaces (trainer/student) wrap their major sections in this so a busted
 * tile doesn't blank the whole page.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Server-side logging is the supervisor agent's job; here we surface to
    // the console for dev visibility. Production wiring (Sentry, etc.)
    // lands in P9.
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('UI error boundary:', error, info);
    }
  }

  reset = () => this.setState({ error: null });

  override render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
          <h3 className="text-base font-semibold">Something broke.</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.error.message}
          </p>
          <Button variant="outline" onClick={this.reset}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
