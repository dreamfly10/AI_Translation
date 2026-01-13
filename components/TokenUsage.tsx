'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useLanguage } from '@/contexts/LanguageContext';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.details || data.error || data.message || 'Failed to create checkout session';
        throw new Error(errorMsg);
      }

      const { sessionId, url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else if (sessionId) {
        const stripe = await stripePromise;
        if (stripe) {
          const { error: stripeError } = await (stripe as any).redirectToCheckout({ sessionId });
          if (stripeError) {
            throw stripeError;
          }
        } else {
          throw new Error('Stripe failed to load');
        }
      } else {
        throw new Error('No checkout URL or session ID received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="button primary"
        style={{
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? 'Loading...' : 'Upgrade'}
      </button>
      {error && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          padding: '0.5rem',
          background: 'var(--color-error)',
          color: 'white',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          zIndex: 1000,
          whiteSpace: 'nowrap'
        }}>
          {error}
        </div>
      )}
    </>
  );
}

interface TokenUsage {
  allowed: boolean;
  tokensUsed: number;
  tokensRemaining: number;
  limit: number;
  userType: 'trial' | 'paid';
}

export function TokenUsage() {
  const { t } = useLanguage();
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/token-usage');
      if (!response.ok) {
        throw new Error('Failed to fetch token usage');
      }
      const data = await response.json();
      setUsage(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load token usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000);
    
    // Listen for manual refresh events (e.g., after upgrade)
    const handleRefresh = () => {
      fetchUsage();
    };
    window.addEventListener('refreshTokenUsage', handleRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshTokenUsage', handleRefresh);
    };
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading token usage...</p>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="card" style={{ 
        marginBottom: 'var(--spacing-lg)', 
        background: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'var(--color-error)'
      }}>
        <p style={{ color: 'var(--color-error)' }}>Error: {error || 'Failed to load token usage'}</p>
      </div>
    );
  }

  const percentage = usage.limit > 0 ? (usage.tokensUsed / usage.limit) * 100 : 0;
  const isLow = percentage > 80;
  const isExceeded = usage.tokensRemaining <= 0 && usage.userType === 'trial';

  return (
    <div className="card" style={{ 
      marginBottom: 'var(--spacing-lg)',
      background: isExceeded ? 'rgba(239, 68, 68, 0.1)' : isLow ? 'rgba(245, 158, 11, 0.1)' : 'var(--color-background)',
      borderColor: isExceeded ? 'var(--color-error)' : isLow ? 'var(--color-warning)' : 'var(--color-border)',
      borderWidth: isExceeded || isLow ? '2px' : '1px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{t('userhome.tokenUsage')}</h3>
          {usage.userType === 'trial' ? (
            <span style={{ 
              padding: '0.25rem 0.5rem',
              background: 'rgba(245, 158, 11, 0.1)',
              color: 'var(--color-warning)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: '1px solid var(--color-warning)'
            }}>
              Trial Plan
            </span>
          ) : (
            <span style={{ 
              padding: '0.25rem 0.5rem',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#28a745',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: '1px solid #28a745'
            }}>
              {t('userhome.paidPlan')}
            </span>
          )}
        </div>
        {usage.userType === 'trial' && (
          <UpgradeButton />
        )}
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{
          width: '100%',
          height: '24px',
          background: 'var(--color-background-tertiary)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          marginBottom: 'var(--spacing-md)'
        }}>
          <div
            style={{
              width: `${Math.min(percentage, 100)}%`,
              height: '100%',
              background: isExceeded ? 'var(--color-error)' : isLow ? 'var(--color-warning)' : 'var(--color-success)',
              transition: 'width var(--transition-slow)',
              borderRadius: 'var(--radius-full)'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          <span>
            {usage.tokensUsed.toLocaleString()} / {usage.limit.toLocaleString()} {t('userhome.tokensUsed')}
          </span>
          {usage.userType === 'trial' && (
            <span style={{ color: isExceeded ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
              {usage.tokensRemaining.toLocaleString()} remaining
            </span>
          )}
        </div>
      </div>

      {isExceeded && (
        <div style={{
          padding: 'var(--spacing-md)',
          background: 'var(--color-background)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-error)',
          marginTop: 'var(--spacing-md)'
        }}>
          <p style={{ margin: 0, color: 'var(--color-error)', fontWeight: 600 }}>
            ⚠️ Token limit reached! Please upgrade to continue using the service.
          </p>
        </div>
      )}

      {usage.userType === 'trial' && !isExceeded && isLow && (
        <div style={{
          padding: 'var(--spacing-md)',
          background: 'var(--color-background)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-warning)',
          marginTop: 'var(--spacing-md)'
        }}>
          <p style={{ margin: 0, color: 'var(--color-warning)', fontWeight: 500 }}>
            ⚠️ You're running low on tokens. Consider upgrading for unlimited access.
          </p>
        </div>
      )}
    </div>
  );
}

