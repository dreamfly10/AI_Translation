'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { TokenUsage } from '@/components/TokenUsage';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function UpgradePageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Always redirect to home page - upgrade functionality is now on home page
    // This page is kept for backward compatibility but immediately redirects
    const successParam = searchParams?.get('success');
    const canceledParam = searchParams?.get('canceled');

    if (successParam === 'true') {
      // Redirect to home with success parameter
      router.replace('/?upgrade=success');
    } else {
      // Redirect to home page (upgrade is now done from home page)
      router.replace('/');
    }
  }, [searchParams, router]);

  const handleUpgrade = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Create checkout session
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
        // Fallback: use Stripe.js redirect
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
      let errorMessage = 'An error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check if it's a fetch error with details
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="container">Loading...</div>;
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <main className="container">
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: 'var(--spacing-xl)' }}>
        <h1>Upgrade to Paid</h1>

        <TokenUsage />

        <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
          <h2>Paid Plan Benefits</h2>
          <ul style={{ lineHeight: '1.8', marginBottom: 'var(--spacing-lg)' }}>
            <li>✅ <strong>100,000 tokens</strong> per month</li>
            <li>✅ <strong>30-day subscription</strong> period</li>
            <li>✅ <strong>Priority support</strong></li>
            <li>✅ <strong>No usage restrictions</strong></li>
            <li>✅ <strong>Full access</strong> to all features</li>
          </ul>

          <div style={{ 
            marginTop: 'var(--spacing-xl)', 
            padding: 'var(--spacing-lg)', 
            background: 'var(--color-background-secondary)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>Pricing</h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)' }}>
              $9.99<span style={{ fontSize: '1rem', color: 'var(--color-text-secondary)' }}>/month</span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              Cancel anytime. No hidden fees.
            </p>
          </div>

          {error && (
            <div style={{ 
              color: 'var(--color-error)', 
              marginTop: 'var(--spacing-lg)',
              padding: 'var(--spacing-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-error)'
            }}>
              <strong>Error:</strong> {error}
              <div style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.875rem', opacity: 0.8 }}>
                Please check the server console for more details. Common issues:
                <ul style={{ marginTop: 'var(--spacing-xs)', paddingLeft: '1.5rem' }}>
                  <li>Invalid Stripe API key</li>
                  <li>Invalid Price ID</li>
                  <li>Network connectivity issues</li>
                </ul>
              </div>
            </div>
          )}

          {success && (
            <div style={{ 
              color: 'var(--color-success)', 
              marginTop: 'var(--spacing-lg)',
              padding: 'var(--spacing-md)',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-success)'
            }}>
              ✅ Payment successful! Upgrading your account...
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading || success}
            className="button primary"
            style={{
              marginTop: 'var(--spacing-xl)',
              width: '100%',
              padding: 'var(--spacing-md) var(--spacing-xl)',
              fontSize: '1.125rem',
              fontWeight: 600
            }}
          >
            {loading ? 'Processing...' : success ? 'Upgraded!' : 'Upgrade to Paid Plan'}
          </button>

          <p style={{ 
            marginTop: 'var(--spacing-md)', 
            fontSize: '0.875rem', 
            color: 'var(--color-text-secondary)',
            textAlign: 'center'
          }}>
            🔒 Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </main>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <main className="container">
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: 'var(--spacing-xl)' }}>
          <div>Loading...</div>
        </div>
      </main>
    }>
      <UpgradePageContent />
    </Suspense>
  );
}

