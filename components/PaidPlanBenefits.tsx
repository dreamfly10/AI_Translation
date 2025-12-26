'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function PaidPlanBenefits() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

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
    <div id="paid-plan" className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
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
          border: '1px solid var(--color-error)',
          fontSize: '0.875rem'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="button primary"
        style={{
          marginTop: 'var(--spacing-xl)',
          width: '100%',
          padding: 'var(--spacing-md) var(--spacing-xl)',
          fontSize: '1.125rem',
          fontWeight: 600
        }}
      >
        {loading ? 'Processing...' : 'Upgrade to Paid Plan'}
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
  );
}

