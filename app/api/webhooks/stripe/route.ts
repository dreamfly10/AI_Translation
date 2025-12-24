import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe signature' },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Validate Stripe is configured
  if (!isStripeConfigured()) {
    console.error('STRIPE_SECRET_KEY is not configured');
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;

        if (!userId) {
          console.error('No userId in checkout session metadata');
          break;
        }

        console.log(`Processing checkout.session.completed for user ${userId}`);

        // Get the subscription to get the actual period dates
        let subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default fallback
        
        if (session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription) as any;
            if (subscription.current_period_end) {
              subscriptionExpiresAt = new Date(subscription.current_period_end * 1000);
              console.log(`Subscription period ends at: ${subscriptionExpiresAt.toISOString()}`);
            }
          } catch (err) {
            console.error('Error retrieving subscription:', err);
            // Use fallback date
          }
        }

        // Update user to paid status with 1M tokens
        // Reset tokensUsed to 0 when user first subscribes
        await db.user.update(userId, {
          userType: 'paid',
          tokenLimit: 1000000, // 1M tokens for paid users
          tokensUsed: 0, // Reset token usage when subscription starts
          subscriptionStatus: 'active',
          subscriptionExpiresAt: subscriptionExpiresAt,
          paymentId: session.id,
        });

        console.log(`Successfully upgraded user ${userId} to paid status with 1M tokens`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          // Try to find user by customer ID or subscription ID
          console.log('No userId in subscription metadata, skipping update');
          break;
        }

        console.log(`Processing subscription.updated for user ${userId}`);

        // Update subscription status based on Stripe subscription status
        if (subscription.status === 'active') {
          await db.user.update(userId, {
            subscriptionStatus: 'active',
            subscriptionExpiresAt: new Date(subscription.current_period_end * 1000),
            tokenLimit: 1000000, // Ensure 1M tokens for active subscription
            paymentId: subscription.id,
          });
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await db.user.update(userId, {
            subscriptionStatus: 'expired',
            paymentId: subscription.id,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          console.log('No userId in subscription metadata, skipping deletion');
          break;
        }

        console.log(`Processing subscription.deleted for user ${userId}`);

        // Downgrade user back to trial
        // Reset tokensUsed when downgrading to trial
        await db.user.update(userId, {
          userType: 'trial',
          tokenLimit: 1000,
          tokensUsed: 0, // Reset token usage when downgrading
          subscriptionStatus: 'cancelled',
          paymentId: undefined,
        });

        console.log(`Successfully downgraded user ${userId} to trial`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          // Get subscription to find user
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
          const userId = subscription.metadata?.userId;

          if (userId) {
            console.log(`Processing payment succeeded for user ${userId}`);
            
            // Check if this is a new billing period (renewal)
            // Reset token usage on monthly subscription renewal
            const isRenewal = invoice.billing_reason === 'subscription_cycle' || 
                              invoice.billing_reason === 'subscription_update';
            
            // Prepare update data
            const updateData: any = {
              subscriptionStatus: 'active',
              subscriptionExpiresAt: subscription.current_period_end 
                ? new Date(subscription.current_period_end * 1000) 
                : undefined,
              tokenLimit: 1000000, // Ensure 1M tokens on renewal
            };
            
            // Reset tokensUsed on monthly renewal
            if (isRenewal) {
              updateData.tokensUsed = 0;
              console.log(`Token usage reset for user ${userId} on subscription renewal`);
            }
            
            // Extend subscription expiration and ensure token limit
            await db.user.update(userId, updateData);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
          const userId = subscription.metadata?.userId;

          if (userId) {
            console.log(`Payment failed for user ${userId}`);
            // Optionally notify user or update status
            // For now, we'll keep them active but could add logic here
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Disable body parsing for webhooks (Next.js will handle it)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

