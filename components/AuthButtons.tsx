'use client';

import { signIn, signOut, getProviders } from 'next-auth/react';
import { Session } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface AuthButtonsProps {
  session: Session | null;
}

export default function AuthButtons({ session }: AuthButtonsProps) {
  const router = useRouter();
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
      await signIn('credentials', {
        email: registerData.email,
        password: registerData.password,
        redirect: false,
      });

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
          fontSize: '0.875rem',
          display: 'none'
        }}>
          {session.user?.email || session.user?.name}
        </span>
        <span style={{ 
          color: 'var(--color-text-secondary)', 
          fontSize: '0.875rem'
        }}>
          {session.user?.name || session.user?.email?.split('@')[0]}
        </span>
        <button className="outline" onClick={() => signOut()}>Sign Out</button>
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

