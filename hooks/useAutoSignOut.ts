'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const WARNING_TIME = 4 * 60 * 1000; // Show warning at 4 minutes (1 minute before sign-out)

/**
 * Hook to automatically sign out users after 5 minutes of inactivity
 * Tracks mouse movements, clicks, keyboard input, and scroll events
 * Shows a warning notification 1 minute before sign-out
 */
export function useAutoSignOut() {
  const { data: session } = useSession();
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Only set up auto sign-out if user is logged in
    if (!session) {
      // Clear timeout if user is not logged in
      setShowWarning(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      return;
    }

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      
      // Hide warning if user becomes active
      setShowWarning(false);
      
      // Clear existing timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }

      // Set warning timeout (at 4 minutes)
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarning(true);
      }, WARNING_TIME);

      // Set sign-out timeout (at 5 minutes)
      timeoutRef.current = setTimeout(() => {
        console.log('Auto sign-out: 5 minutes of inactivity detected');
        setShowWarning(false);
        signOut({ 
          redirect: false,
          callbackUrl: '/'
        }).then(() => {
          router.push('/');
          router.refresh();
        });
      }, INACTIVITY_TIMEOUT);
    };

    // Reset timer on initial mount
    resetTimer();

    // Activity event handlers
    const handleActivity = () => {
      resetTimer();
    };

    // List of events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup function
    return () => {
      // Remove event listeners
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [session, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  return { showWarning };
}

