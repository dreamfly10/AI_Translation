'use client';

import { signIn, getProviders } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const callbackUrl = searchParams?.get('callbackUrl') || '/';
  const errorParam = searchParams?.get('error');

  // Check if Google auth is available
  useEffect(() => {
    getProviders().then((providers) => {
      setGoogleEnabled(!!providers?.google);
    });
    
    // Clear error from URL if present (NextAuth redirects with error param)
    // Only clear if it's in the URL, but don't show error until user actually tries to sign in
    if (errorParam === 'CredentialsSignin') {
      // Clear the error from URL immediately so it doesn't show on page load
      const newUrl = window.location.pathname + (callbackUrl !== '/' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [errorParam, callbackUrl]);

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: callbackUrl,
      });

      if (result?.error) {
        // Check if it's a real error or just NextAuth being weird
        if (result.error === 'CredentialsSignin') {
          setError('Invalid email or password');
        } else {
          setError(`Sign in failed: ${result.error}`);
        }
        setLoading(false);
        return;
      }

      // If successful, wait for session to be established
      if (result?.ok) {
        // Use window.location for a full page reload to ensure session is loaded
        // This is more reliable than router.push for authentication
        window.location.href = callbackUrl;
        return;
      }

      // Fallback: if result is undefined or doesn't have ok/error, try redirect anyway
      // Sometimes NextAuth doesn't return proper result but still signs in
      setTimeout(() => {
        window.location.href = callbackUrl;
      }, 500);
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An error occurred during sign in. Please try again.');
      setLoading(false);
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
          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              width: '100%', 
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-md) var(--spacing-xl)',
              borderRadius: '1.5rem',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-base)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
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
              onClick={() => {
                // Store callback URL in sessionStorage so we can use it after Google redirect
                sessionStorage.setItem('googleCallbackUrl', callbackUrl);
                signIn('google', { callbackUrl });
              }}
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

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="container" style={{ maxWidth: '440px', margin: '4rem auto', paddingTop: 'var(--spacing-3xl)' }}>
        <div className="card">
          <h1 style={{ textAlign: 'center' }}>Loading...</h1>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}

