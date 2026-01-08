'use client';

import { useState, useEffect } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GetStartedModal({ isOpen, onClose }: GetStartedModalProps) {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  // Check if providers are available
  useEffect(() => {
    getProviders().then((providers) => {
      setGoogleEnabled(!!providers?.google);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Register new user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      // Auto sign in after registration
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error('Failed to sign in after registration');
      }

      if (signInResult?.ok) {
        window.location.reload();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' });
  };


  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '2rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '440px',
          width: '100%',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 'var(--spacing-md)',
            right: 'var(--spacing-md)',
            background: 'transparent',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            transition: 'background var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-background-secondary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
        >
          ×
        </button>

        {/* Logo/Title */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            borderRadius: 'var(--radius-md)',
            margin: '0 auto var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#fff'
          }}>
            R
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-xs)'
          }}>
            {language === 'en' ? 'Create an Account' : '创建账户'}
          </h1>
          <p style={{
            margin: 0,
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--spacing-xs)'
          }}>
            {language === 'en' ? (
              <>Already have an account? <button
                onClick={() => {
                  onClose();
                  window.location.href = '/auth/signin';
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  fontSize: '0.875rem'
                }}
              >Log in.</button></>
            ) : (
              <>已有账户？ <button
                onClick={() => {
                  onClose();
                  window.location.href = '/auth/signin';
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  fontSize: '0.875rem'
                }}
              >登录</button></>
            )}
          </p>
        </div>

        {/* Social Login Buttons */}
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
          {googleEnabled && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              style={{
                flex: 1,
                padding: 'var(--spacing-md)',
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-sm)',
                transition: 'all var(--transition-base)',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-background-tertiary)';
                e.currentTarget.style.borderColor = 'var(--color-border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-background-secondary)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>G</span>
              {language === 'en' ? 'Login with Google' : '使用 Google 登录'}
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 'var(--spacing-lg)',
          position: 'relative'
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'var(--color-border)'
          }} />
          <span style={{
            padding: '0 var(--spacing-md)',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem'
          }}>
            {language === 'en' ? 'or' : '或'}
          </span>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'var(--color-border)'
          }} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label style={{
              display: 'block',
              marginBottom: 'var(--spacing-xs)',
              fontSize: '0.875rem',
              color: 'var(--color-text-primary)',
              fontWeight: 500
            }}>
              {language === 'en' ? 'Email' : '邮箱'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === 'en' ? 'alan.turing@example.com' : 'example@email.com'}
              required
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  background: 'var(--color-background-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
            />
          </div>

          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{
              display: 'block',
              marginBottom: 'var(--spacing-xs)',
              fontSize: '0.875rem',
              color: 'var(--color-text-primary)',
              fontWeight: 500
            }}>
              {language === 'en' ? 'Password' : '密码'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === 'en' ? 'Enter your password' : '输入您的密码'}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  paddingRight: '3rem',
                  background: 'var(--color-background-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 'var(--spacing-sm)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  padding: 'var(--spacing-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: 'var(--spacing-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-md)',
              fontSize: '0.875rem',
              border: '1px solid #ef4444'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 'var(--spacing-md)',
              background: loading 
                ? 'var(--color-background-secondary)' 
                : 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all var(--transition-base)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--color-primary-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--color-primary)';
              }
            }}
          >
            {loading
              ? (language === 'en' ? 'Creating Account...' : '创建账户中...')
              : (language === 'en' ? 'Create Account' : '创建账户')}
          </button>
        </form>
      </div>
    </div>
  );
}

