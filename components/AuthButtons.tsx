'use client';

import { signIn, signOut, getProviders } from 'next-auth/react';
import { Session } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSettingsModal } from '@/contexts/SettingsModalContext';

interface AuthButtonsProps {
  session: Session | null;
  variant?: "header" | "landing" | "default";
}

export default function AuthButtons({ session, variant }: AuthButtonsProps) {
  const router = useRouter();
  const { openModal: openSettingsModal } = useSettingsModal();
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // Check if Google auth is available
  useEffect(() => {
    getProviders().then((providers) => {
      setGoogleEnabled(!!providers?.google);
    });
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      // Sign in after registration
      const signInResult = await signIn('credentials', {
        email: registerData.email,
        password: registerData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error('Failed to sign in after registration');
      }

      // Use window.location for full page reload to ensure session is loaded
      if (signInResult?.ok) {
        window.location.href = '/';
        return;
      }

      // Fallback
      router.refresh();
      setShowRegister(false);
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegisterLoading(false);
    }
  };

  if (session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <span style={{ 
          color: 'var(--color-text-secondary)', 
          fontSize: '1.125rem',
          fontWeight: 500
        }}>
          {session.user?.name || session.user?.email?.split('@')[0]}
        </span>
        <button 
          className="outline" 
          onClick={() => openSettingsModal()}
          style={{
            fontSize: '1.5rem',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '48px',
            minHeight: '48px'
          }}
          title="Settings"
        >
          ⚙️
        </button>
        <button 
          className="outline" 
          onClick={() => signOut()}
          style={{
            fontSize: '1.125rem',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 500
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  // For header variant, show only Log In and Get Started
  if (variant === 'header') {
    // We'll handle Get Started modal in the parent component (page.tsx)
    // For now, just show Log In button
    return (
      <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
        <button 
          className="outline"
          onClick={() => router.push('/auth/signin')}
          style={{
            fontSize: '0.875rem',
            padding: '0.5rem 1rem'
          }}
        >
          Log In
        </button>
        <button 
          onClick={() => {
            // This will be handled by the parent component
            // For now, open sign-in page
            router.push('/auth/signin');
          }}
          style={{
            fontSize: '0.875rem',
            padding: '0.5rem 1rem',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer'
          }}
        >
          Get Started
        </button>
      </div>
    );
  }

  return (
    <div>
      {showRegister ? (
        <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Create Account</h2>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <input
              type="email"
              placeholder="Email"
              value={registerData.email}
              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              required
              minLength={6}
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={registerData.name}
              onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
            />
            <button type="submit" disabled={registerLoading}>
              {registerLoading ? 'Registering...' : 'Create Account'}
            </button>
            <button type="button" className="outline" onClick={() => setShowRegister(false)}>
              Cancel
            </button>
            {registerError && (
              <div style={{ 
                color: 'var(--color-error)', 
                padding: 'var(--spacing-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem'
              }}>
                {registerError}
              </div>
            )}
          </form>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => signIn('credentials')}>Sign In</button>
          {googleEnabled && (
            <button className="secondary" onClick={() => signIn('google')}>
              Sign In with Google
            </button>
          )}
          <button className="outline" onClick={() => setShowRegister(true)}>Get Started Free</button>
        </div>
      )}
    </div>
  );
}

