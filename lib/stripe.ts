import Stripe from 'stripe';

// Get Stripe secret key
const secretKey = process.env.STRIPE_SECRET_KEY;

// Only initialize Stripe if secret key is provided (allows build to proceed)
// Runtime code should check for stripe availability before use
let stripeInstance: Stripe | null = null;

if (secretKey) {
  // Validate Stripe secret key format
  if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
    console.warn('Warning: STRIPE_SECRET_KEY does not start with sk_test_ or sk_live_');
  }
  
  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  });
}

// Export stripe client - use type assertion to allow build, but check at runtime
export const stripe = stripeInstance as Stripe;

// Helper to check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!stripeInstance && !!process.env.STRIPE_SECRET_KEY;
}

// Price ID for the subscription (set this in your Stripe Dashboard)
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';

// Validate Price ID format if set
if (STRIPE_PRICE_ID && !STRIPE_PRICE_ID.startsWith('price_')) {
  console.warn('Warning: STRIPE_PRICE_ID does not start with price_');
}

// Price IDs for token purchases (one-time payments)
export const STRIPE_PRICE_ID_10K = process.env.STRIPE_TOKEN_10K_PRICE_ID || '';
export const STRIPE_PRICE_ID_50K = process.env.STRIPE_TOKEN_50K_PRICE_ID || '';

// Validate token price IDs if set
if (STRIPE_PRICE_ID_10K && !STRIPE_PRICE_ID_10K.startsWith('price_')) {
  console.warn('Warning: STRIPE_PRICE_ID_10K does not start with price_');
}
if (STRIPE_PRICE_ID_50K && !STRIPE_PRICE_ID_50K.startsWith('price_')) {
  console.warn('Warning: STRIPE_PRICE_ID_50K does not start with price_');
}
