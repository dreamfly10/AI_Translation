import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { z } from 'zod';

const buyTokensSchema = z.object({
  amount: z.enum(['10k', '50k']),
});

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { 
          error: 'STRIPE_NOT_CONFIGURED',
          message: 'Stripe is not configured. Please contact support.',
          details: 'STRIPE_SECRET_KEY is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { amount } = buyTokensSchema.parse(body);

    // Read price ID directly from process.env (runtime, not module load time)
    const envVarName = amount === '10k' ? 'STRIPE_TOKEN_10K_PRICE_ID' : 'STRIPE_TOKEN_50K_PRICE_ID';
    const priceId = process.env[envVarName] || '';
    const tokenAmount = amount === '10k' ? 10000 : 50000;

    if (!priceId) {
      console.error(`[BUY TOKENS] ${envVarName} check:`, {
        exists: process.env[envVarName] !== undefined,
        value: process.env[envVarName] || 'empty',
        allStripePriceKeys: Object.keys(process.env).filter(k => k.includes('STRIPE_PRICE'))
      });
      
      return NextResponse.json(
        { 
          error: 'PRICE_ID_MISSING',
          message: `Price ID for ${amount} tokens is not configured. Please contact support.`,
          details: `${envVarName} is missing. Please check your .env.local file and restart the dev server (stop with Ctrl+C, then run npm run dev again).`
        },
        { status: 500 }
      );
    }

    // Create Stripe checkout session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment', // One-time payment, not subscription
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: session.user.email || undefined,
      success_url: `${request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/?tokens=purchased`,
      cancel_url: `${request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/`,
      metadata: {
        userId: session.user.id,
        tokenAmount: tokenAmount.toString(),
        purchaseType: 'tokens',
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'INVALID_INPUT',
          message: 'Invalid amount provided',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    console.error('Error creating token purchase session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'CHECKOUT_SESSION_ERROR',
        message: 'Failed to create checkout session',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

