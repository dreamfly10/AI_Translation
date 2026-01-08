/**
 * ⚠️ IMPORTANT
 * Do not refactor or change behavior in this file.
 * Changes here must be minimal and error-driven only.
 * ⚠️ IMPORTANT: This file wraps all context providers.
    * If adding new providers, add them here in this order:
    * 1. SessionProvider (outermost)
    * 2. LanguageProvider
    * 3. AuthModalProvider
    * 4. SettingsModalProvider
    * See DEPENDENCIES.md for full dependency tree
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthModalProvider } from '@/contexts/AuthModalContext';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';

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

  return (
    <SessionProvider>
      <LanguageProvider>
        <AuthModalProvider>
          <SettingsModalProvider>
            {children}
          </SettingsModalProvider>
        </AuthModalProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}

