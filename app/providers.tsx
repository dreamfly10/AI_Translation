'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle unhandled promise rejections (common with browser extensions)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason || '');
      
      // Suppress the common browser extension error
      if (
        errorMessage.includes('message channel closed') ||
        errorMessage.includes('asynchronous response') ||
        errorMessage.includes('Extension context invalidated')
      ) {
        event.preventDefault();
        // Optionally log in development only
        if (process.env.NODE_ENV === 'development') {
          console.debug('Suppressed browser extension error:', errorMessage);
        }
        return;
      }
      
      // Log other unhandled rejections in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Unhandled promise rejection:', event.reason);
      }
    };

    // Handle general errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || String(event.error || '');
      
      // Suppress the common browser extension error
      if (
        errorMessage.includes('message channel closed') ||
        errorMessage.includes('asynchronous response') ||
        errorMessage.includes('Extension context invalidated')
      ) {
        event.preventDefault();
        // Optionally log in development only
        if (process.env.NODE_ENV === 'development') {
          console.debug('Suppressed browser extension error:', errorMessage);
        }
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}

