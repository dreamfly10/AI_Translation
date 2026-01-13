'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

function ForgotPasswordContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to send reset code');
      }

      setSuccess(true);
      // Redirect to verify OTP page after 2 seconds
      setTimeout(() => {
        router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '440px', margin: '4rem auto', paddingTop: 'var(--spacing-3xl)' }}>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          {t('auth.forgotPassword')}
        </h1>

        {success ? (
          <div style={{
            padding: 'var(--spacing-lg)',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--color-success)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-lg)',
            border: '1px solid var(--color-success)',
            textAlign: 'center'
          }}>
            ✅ {t('auth.resetCodeSent')}
          </div>
        ) : (
          <>
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              marginBottom: 'var(--spacing-lg)',
              textAlign: 'center',
              fontSize: '0.875rem'
            }}>
              {t('auth.forgotPasswordDescription')}
            </p>

            <form onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-lg)' }}>
              <input
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{ marginBottom: 'var(--spacing-md)' }}
              />
              
              {error && (
                <div style={{ 
                  color: 'var(--color-error)', 
                  marginBottom: 'var(--spacing-md)',
                  padding: 'var(--spacing-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem'
                }}>
                  {error}
                </div>
              )}

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
              >
                {loading ? t('auth.sending') : t('auth.sendResetCode')}
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
          <Link href="/auth/signin" style={{ 
            color: 'var(--color-primary)', 
            textDecoration: 'none',
            fontSize: '0.875rem',
            transition: 'color var(--transition-base)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
          >
            ← {t('auth.backToSignIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  return (
    <Suspense fallback={
      <div className="container" style={{ maxWidth: '440px', margin: '4rem auto', paddingTop: 'var(--spacing-3xl)' }}>
        <div className="card">
          <h1 style={{ textAlign: 'center' }}>Loading...</h1>
        </div>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
