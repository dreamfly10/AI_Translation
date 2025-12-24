import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, STRIPE_PRICE_ID, isStripeConfigured } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if price ID is configured
    if (!STRIPE_PRICE_ID) {
      console.error('STRIPE_PRICE_ID is not configured');
      console.error('Environment check:', {
        hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasStripePriceId: !!process.env.STRIPE_PRICE_ID,
        stripePriceIdValue: process.env.STRIPE_PRICE_ID || 'NOT SET',
      });
      return NextResponse.json(
        { 
          error: 'Payment system not configured. Please contact support.',
          details: 'STRIPE_PRICE_ID environment variable is missing. Please check your .env.local file and restart the dev server.'
        },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    console.log('Creating checkout session with:', {
      priceId: STRIPE_PRICE_ID,
      userId: session.user.id,
      userEmail: session.user.email,
      baseUrl,
    });

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription', // Recurring subscription
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      customer_email: session.user.email || undefined,
      metadata: {
        userId: session.user.id,
        userEmail: session.user.email || '',
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
        },
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Check if it's a Stripe error
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      console.error('Stripe error type:', stripeError.type);
      console.error('Stripe error code:', stripeError.code);
      console.error('Stripe error message:', stripeError.message);
      
      return NextResponse.json(
        { 
          error: 'Failed to create checkout session',
          message: stripeError.message || 'Stripe API error',
          details: `Stripe error: ${stripeError.type} - ${stripeError.code || 'unknown'}`,
          stripeError: process.env.NODE_ENV === 'development' ? {
            type: stripeError.type,
            code: stripeError.code,
            message: stripeError.message,
          } : undefined,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session', 
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

