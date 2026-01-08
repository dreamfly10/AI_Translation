import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, isStripeConfigured, STRIPE_PRICE_ID } from '@/lib/stripe';

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
          details: 'STRIPE_SECRET_KEY or STRIPE_PRICE_ID is missing'
        },
        { status: 500 }
      );
    }

    if (!STRIPE_PRICE_ID) {
      return NextResponse.json(
        { 
          error: 'PRICE_ID_MISSING',
          message: 'Price ID is not configured. Please contact support.',
          details: 'STRIPE_PRICE_ID is missing'
        },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: session.user.email || undefined,
      success_url: `${request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/upgrade?upgrade=success`,
      cancel_url: `${request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/upgrade?upgrade=cancelled`,
      metadata: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
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

