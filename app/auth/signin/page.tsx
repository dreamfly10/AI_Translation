'use client';

import { signIn, getProviders } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const callbackUrl = searchParams?.get('callbackUrl') || '/';

  // Check if Google auth is available
  useEffect(() => {
    getProviders().then((providers) => {
      setGoogleEnabled(!!providers?.google);
    });
  }, []);

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password');
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="container" style={{ maxWidth: '440px', margin: '4rem auto', paddingTop: 'var(--spacing-3xl)' }}>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>Sign In</h1>

        <form onSubmit={handleCredentialsSignIn} style={{ marginTop: 'var(--spacing-lg)' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 'var(--spacing-md)' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          {error && (
            <div style={{ 
              color: 'var(--color-error)', 
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}
        </form>

        {googleEnabled && (
          <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
            <div style={{ margin: 'var(--spacing-lg) 0', color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>or</div>
            <button
              className="secondary"
              onClick={() => signIn('google', { callbackUrl })}
              style={{ width: '100%' }}
            >
              Sign In with Google
            </button>
          </div>
        )}

        <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
          <Link href="/" style={{ 
            color: 'var(--color-primary)', 
            textDecoration: 'none',
            fontSize: '0.875rem',
            transition: 'color var(--transition-base)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

