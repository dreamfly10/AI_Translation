import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

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

    // Get user to check if they have a Stripe customer ID
    const user = await db.user.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a payment ID (Stripe customer ID)
    let customerId = user.paymentId;

    if (!customerId) {
      // Try to find existing customer by email in Stripe
      // This handles cases where customer was created during checkout but not saved to DB
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        // Save the customer ID to the user record
        await db.user.update(session.user.id, {
          paymentId: customerId,
        });
      } else {
        // No customer found - user needs to complete a payment first
        return NextResponse.json(
          { 
            error: 'NO_CUSTOMER_FOUND',
            message: 'No payment information found. Please complete a subscription purchase first.',
            details: 'Customer not found in Stripe. Please upgrade to Premium Plan first.'
          },
          { status: 400 }
        );
      }
    }

    // Verify the customer exists and has subscriptions/payment methods
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        return NextResponse.json(
          { 
            error: 'CUSTOMER_DELETED',
            message: 'Your customer account was deleted. Please contact support.',
            userMessage: 'Your payment account was deleted. Please contact support for assistance.'
          },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error('Error retrieving customer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { 
          error: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found in Stripe. Please contact support.',
          userMessage: 'Unable to access your payment information. Please contact support if this issue persists.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 400 }
      );
    }

    // Create Stripe billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'PORTAL_SESSION_ERROR',
        message: 'Failed to create billing portal session',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

