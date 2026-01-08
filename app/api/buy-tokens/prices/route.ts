import { NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe';

export async function GET() {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({
        price10k: null,
        price50k: null,
      });
    }

    const prices: { price10k: string | null; price50k: string | null } = {
      price10k: null,
      price50k: null,
    };

    // Read price IDs directly from process.env (runtime, not module load time)
    const STRIPE_PRICE_ID_10K = process.env.STRIPE_TOKEN_10K_PRICE_ID || '';
    const STRIPE_PRICE_ID_50K = process.env.STRIPE_TOKEN_50K_PRICE_ID || '';

    // Fetch 10K token price
    if (STRIPE_PRICE_ID_10K) {
      try {
        const price10k = await stripe.prices.retrieve(STRIPE_PRICE_ID_10K);
        if (price10k.unit_amount) {
          const amount = price10k.unit_amount / 100; // Convert from cents
          prices.price10k = `$${amount.toFixed(2)}`;
        }
      } catch (err) {
        console.error('Error fetching 10K token price:', err);
      }
    }

    // Fetch 50K token price
    if (STRIPE_PRICE_ID_50K) {
      try {
        const price50k = await stripe.prices.retrieve(STRIPE_PRICE_ID_50K);
        if (price50k.unit_amount) {
          const amount = price50k.unit_amount / 100; // Convert from cents
          prices.price50k = `$${amount.toFixed(2)}`;
        }
      } catch (err) {
        console.error('Error fetching 50K token price:', err);
      }
    }

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return NextResponse.json({
      price10k: null,
      price50k: null,
    });
  }
}

