'use client';

import React from 'react';
import { sanitizeError } from '@/lib/error-handler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log to error reporting service (server-side)
    if (typeof window === 'undefined') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      const sanitized = sanitizeError(this.state.error, 'React Error Boundary');
      return (
        <div style={{ 
          padding: 'var(--spacing-2xl)', 
          textAlign: 'center',
          maxWidth: '600px',
          margin: 'var(--spacing-3xl) auto',
        }}>
          <h2 style={{ 
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-lg)',
            fontSize: '1.5rem',
          }}>
            Something went wrong
          </h2>
          <p style={{ 
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-xl)',
            fontSize: '1rem',
          }}>
            {sanitized.userMessage}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: 'var(--spacing-md) var(--spacing-xl)',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
