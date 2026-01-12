import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { upgradeUserToPaid } from '@/lib/upgrade-user';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Add purchased tokens to user's token limit
 */
async function addTokensToUser(userId: string, tokensToAdd: number) {
  const user = await db.user.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Add tokens to the user's token limit (not reset, but add to existing limit)
  const newTokenLimit = user.tokenLimit + tokensToAdd;

  await db.user.update(userId, {
    tokenLimit: newTokenLimit,
  });

  console.log(`[Token Purchase] Added ${tokensToAdd} tokens to user ${userId}. New limit: ${newTokenLimit}`);
}

/**
 * Stripe Webhook Handler
 * Handles payment events and automatically upgrades users
 */
export async function POST(request: Request) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      console.error('[Stripe Webhook] Stripe is not configured');
      return NextResponse.json(
        { error: 'STRIPE_NOT_CONFIGURED' },
        { status: 500 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set');
      return NextResponse.json(
        { error: 'WEBHOOK_SECRET_MISSING' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'MISSING_SIGNATURE' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Stripe Webhook] Signature verification failed:', errorMessage);
      return NextResponse.json(
        { error: 'INVALID_SIGNATURE', message: errorMessage },
        { status: 400 }
      );
    }

    console.log('[Stripe Webhook] Received event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return createErrorResponse(error, 'Stripe Webhook');
  }
}

/**
 * Handle checkout.session.completed event
 * This fires when a user completes payment (subscription or token purchase)
 */
async function handleCheckoutSessionCompleted(session: any) {
  try {
    const userId = session.metadata?.userId;
    if (!userId) {
      console.error('[Stripe Webhook] No userId in checkout session metadata');
      return;
    }

    console.log('[Stripe Webhook] Checkout session completed for user:', userId);

    const purchaseType = session.metadata?.purchaseType;

    // Handle token purchases
    if (purchaseType === 'tokens') {
      const tokenAmount = parseInt(session.metadata?.tokenAmount || '0', 10);
      if (tokenAmount > 0) {
        await addTokensToUser(userId, tokenAmount);
        console.log(`[Stripe Webhook] Successfully added ${tokenAmount} tokens to user:`, userId);
        return;
      }
    }

    // Handle subscription upgrades
    // Get subscription details if available
    const subscriptionId = session.subscription;
    let subscriptionExpiresAt: Date | undefined;
    let customerId: string | undefined;

    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string) as any;
        if (subscription?.current_period_end) {
          subscriptionExpiresAt = new Date(subscription.current_period_end * 1000);
        }
        if (subscription?.customer) {
          customerId = typeof subscription.customer === 'string' 
            ? subscription.customer 
            : subscription.customer.id;
        }
      } catch (err) {
        console.error('[Stripe Webhook] Error retrieving subscription:', err);
      }
    }

    // Get customer ID from session if not from subscription
    if (!customerId) {
      customerId = session.customer as string;
    }

    // Upgrade user to paid
    await upgradeUserToPaid({
      userId,
      subscriptionExpiresAt,
      paymentId: customerId,
    });

    console.log('[Stripe Webhook] Successfully upgraded user:', userId);
  } catch (error) {
    console.error('[Stripe Webhook] Error handling checkout.session.completed:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 * Updates subscription expiration when subscription is renewed
 */
async function handleSubscriptionUpdated(subscription: any) {
  try {
    const customerId = subscription.customer as string;
    
    // Find user by payment_id (customer ID)
    // Note: This requires a query, which we don't have in db.ts
    // For now, we'll handle this in invoice.payment_succeeded instead
    console.log('[Stripe Webhook] Subscription updated for customer:', customerId);
  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription.updated:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 * Marks subscription as cancelled
 */
async function handleSubscriptionDeleted(subscription: any) {
  try {
    const customerId = subscription.customer as string;
    
    // Find and update user by payment_id
    // This would require a query by payment_id, which we don't currently have
    // For now, we'll mark subscription as cancelled when it expires naturally
    console.log('[Stripe Webhook] Subscription deleted for customer:', customerId);
  } catch (error) {
    console.error('[Stripe Webhook] Error handling subscription.deleted:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_succeeded event
 * Updates subscription expiration on renewal
 */
async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription;
    
    if (!subscriptionId) {
      // One-time payment, not a subscription
      return;
    }

    // Get subscription to get expiration date
    const subscription = await stripe.subscriptions.retrieve(subscriptionId as string) as any;
    const subscriptionExpiresAt = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : undefined;

    // Find user by payment_id (customer ID)
    // Since we don't have a findByPaymentId method, we'll need to handle this differently
    // For now, we'll just log it
    console.log('[Stripe Webhook] Invoice payment succeeded for customer:', customerId);
    console.log('[Stripe Webhook] Subscription expires at:', subscriptionExpiresAt);
    
    // TODO: Find user by payment_id and update subscription expiration
    // This requires adding a findByPaymentId method to db.ts
  } catch (error) {
    console.error('[Stripe Webhook] Error handling invoice.payment_succeeded:', error);
    throw error;
  }
}
