import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTokenUsage } from '@/lib/token-tracker';
import { db } from '@/lib/db';
import { stripe, isStripeConfigured } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokenStatus = await getTokenUsage(session.user.id);
    
    // Also fetch user subscription info
    const user = await db.user.findById(session.user.id);
    if (user) {
      // FIX: If user has payment_id or subscription_expires_at but is still marked as 'trial',
      // automatically upgrade them to 'paid' (webhook might have failed)
      if (user.userType === 'trial' && (user.paymentId || user.subscriptionExpiresAt)) {
        console.log(`[Token Usage] Auto-upgrading user ${session.user.id} from trial to paid (has payment_id or subscription)`);
        try {
          // Also check Stripe for active subscription if we have paymentId
          let hasActiveSubscription = false;
          let subscriptionExpiresAt = user.subscriptionExpiresAt;
          
          if (isStripeConfigured() && user.paymentId) {
            try {
              const subscriptions = await stripe.subscriptions.list({
                customer: user.paymentId,
                status: 'active',
                limit: 1,
              });
              
              if (subscriptions.data.length > 0) {
                hasActiveSubscription = true;
                const subscription = subscriptions.data[0] as any;
                if (subscription?.current_period_end) {
                  subscriptionExpiresAt = new Date(subscription.current_period_end * 1000);
                }
              }
            } catch (stripeError) {
              console.error('[Token Usage] Error checking Stripe subscription:', stripeError);
              // Continue with database check if Stripe check fails
            }
          }
          
          const upgradedUser = await db.user.update(session.user.id, {
            userType: 'paid',
            subscriptionStatus: (subscriptionExpiresAt && new Date(subscriptionExpiresAt) > new Date()) || hasActiveSubscription ? 'active' : user.subscriptionStatus || 'active',
            subscriptionExpiresAt: subscriptionExpiresAt || user.subscriptionExpiresAt,
          });
          if (upgradedUser) {
            // Update tokenStatus with the new userType
            tokenStatus.userType = 'paid';
            console.log(`[Token Usage] Successfully auto-upgraded user ${session.user.id}`);
          }
        } catch (error) {
          console.error('[Token Usage] Error auto-upgrading user:', error);
          // Continue with original userType if update fails
        }
      }

      // Calculate subscription start date (30 days before expiration, or created_at if no expiration)
      let subscriptionStartDate: Date | null = null;
      const currentUser = await db.user.findById(session.user.id); // Re-fetch to get updated userType
      if (currentUser) {
        if (currentUser.subscriptionExpiresAt) {
          const expiresAt = new Date(currentUser.subscriptionExpiresAt);
          subscriptionStartDate = new Date(expiresAt.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before
        } else if (currentUser.userType === 'paid') {
          // If paid but no expiration, use created_at as start
          subscriptionStartDate = new Date(currentUser.createdAt);
        }

        return NextResponse.json({
          ...tokenStatus,
          userType: currentUser.userType, // Use the updated userType
          subscriptionStatus: currentUser.subscriptionStatus,
          subscriptionExpiresAt: currentUser.subscriptionExpiresAt,
          subscriptionStartDate: subscriptionStartDate,
        });
      }
    }

    return NextResponse.json(tokenStatus);
  } catch (error) {
    console.error('Token usage error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

