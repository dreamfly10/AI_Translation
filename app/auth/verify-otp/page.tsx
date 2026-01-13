'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6 && /^\d$/.test(char)) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      // Focus next empty input or submit
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      const nextInput = document.getElementById(`otp-${nextIndex}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
      return;
    }

    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError(t('auth.otpRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Invalid OTP code');
      }

      // Redirect to reset password page with token
      router.push(`/auth/reset-password?token=${encodeURIComponent(data.resetToken)}`);
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(err instanceof Error ? err.message : 'Invalid OTP code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      // Focus first input
      const firstInput = document.getElementById('otp-0');
      if (firstInput) {
        (firstInput as HTMLInputElement).focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;

    setResending(true);
    setError(null);
    setCanResend(false);
    setResendCooldown(60); // 60 second cooldown

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to resend code');
      }

      // Success - cooldown will be handled by timer
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend code. Please try again.');
      setCanResend(true);
      setResendCooldown(0);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '440px', margin: '4rem auto', paddingTop: 'var(--spacing-3xl)' }}>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          {t('auth.verifyOTP')}
        </h1>

        <p style={{ 
          color: 'var(--color-text-secondary)', 
          marginBottom: 'var(--spacing-lg)',
          textAlign: 'center',
          fontSize: '0.875rem'
        }}>
          {t('auth.otpDescription')}
        </p>

        {email && (
          <p style={{ 
            color: 'var(--color-text-primary)', 
            marginBottom: 'var(--spacing-md)',
            textAlign: 'center',
            fontSize: '0.875rem',
            fontWeight: 500
          }}>
            {email}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-lg)' }}>
          <div style={{ 
            display: 'flex', 
            gap: 'var(--spacing-sm)', 
            justifyContent: 'center',
            marginBottom: 'var(--spacing-lg)'
          }}>
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedData = e.clipboardData.getData('text');
                  handleOtpChange(0, pastedData);
                }}
                required
                disabled={loading}
                style={{
                  width: '3rem',
                  height: '3rem',
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  border: '2px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{ 
              color: 'var(--color-error)', 
              marginBottom: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || otp.join('').length !== 6} 
            style={{ 
              width: '100%', 
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-md) var(--spacing-xl)',
              borderRadius: '1.5rem',
              background: loading || otp.join('').length !== 6
                ? 'var(--color-background-tertiary)'
                : 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: loading || otp.join('').length !== 6 ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-base)',
              opacity: loading || otp.join('').length !== 6 ? 0.6 : 1
            }}
          >
            {loading ? t('auth.verifying') : t('auth.verify')}
          </button>
        </form>

        <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
          <button
            onClick={handleResend}
            disabled={!canResend || resending || !email}
            style={{
              background: 'transparent',
              border: 'none',
              color: canResend && !resending && email ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
              cursor: canResend && !resending && email ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              textDecoration: 'underline',
              padding: 'var(--spacing-sm)',
            }}
          >
            {resending 
              ? t('auth.resending') 
              : resendCooldown > 0 
                ? t('auth.resendIn').replace('{seconds}', resendCooldown.toString())
                : t('auth.resendCode')}
          </button>
        </div>

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

export default function VerifyOTP() {
  return (
    <Suspense fallback={
      <div className="container" style={{ maxWidth: '440px', margin: '4rem auto', paddingTop: 'var(--spacing-3xl)' }}>
        <div className="card">
          <h1 style={{ textAlign: 'center' }}>Loading...</h1>
        </div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
