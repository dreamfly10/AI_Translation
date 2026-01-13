'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    if (tokenParam) {
      setResetToken(tokenParam);
    } else {
      setError(t('auth.invalidResetToken'));
    }
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to reset password');
      }

      setSuccess(true);
      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        router.push('/auth/signin?passwordReset=success');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container" style={{ maxWidth: '440px', margin: '4rem auto', paddingTop: 'var(--spacing-3xl)' }}>
        <div className="card">
          <div style={{
            padding: 'var(--spacing-lg)',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--color-success)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-lg)',
            border: '1px solid var(--color-success)',
            textAlign: 'center'
          }}>
            ✅ {t('auth.passwordResetSuccess')}
          </div>
          <p style={{ 
            color: 'var(--color-text-secondary)', 
            textAlign: 'center',
            fontSize: '0.875rem'
          }}>
            {t('auth.redirectingToSignIn')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '440px', margin: '4rem auto', paddingTop: 'var(--spacing-3xl)' }}>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          {t('auth.resetPassword')}
        </h1>

        <p style={{ 
          color: 'var(--color-text-secondary)', 
          marginBottom: 'var(--spacing-lg)',
          textAlign: 'center',
          fontSize: '0.875rem'
        }}>
          {t('auth.resetPasswordDescription')}
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-lg)' }}>
          <input
            type="password"
            placeholder={t('auth.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading || !resetToken}
            minLength={6}
            style={{ marginBottom: 'var(--spacing-md)' }}
          />
          
          <input
            type="password"
            placeholder={t('auth.confirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading || !resetToken}
            minLength={6}
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
            disabled={loading || !resetToken || newPassword.length < 6 || newPassword !== confirmPassword} 
            style={{ 
              width: '100%', 
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-md) var(--spacing-xl)',
              borderRadius: '1.5rem',
              background: loading || !resetToken || newPassword.length < 6 || newPassword !== confirmPassword
                ? 'var(--color-background-tertiary)'
                : 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: loading || !resetToken || newPassword.length < 6 || newPassword !== confirmPassword ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-base)',
              opacity: loading || !resetToken || newPassword.length < 6 || newPassword !== confirmPassword ? 0.6 : 1
            }}
          >
            {loading ? t('auth.resetting') : t('auth.resetPassword')}
          </button>
        </form>

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

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="container" style={{ maxWidth: '440px', margin: '4rem auto', paddingTop: 'var(--spacing-3xl)' }}>
        <div className="card">
          <h1 style={{ textAlign: 'center' }}>Loading...</h1>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
