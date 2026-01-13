import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTokenUsage } from '@/lib/token-tracker';
import { db } from '@/lib/db';
import { stripe, isStripeConfigured } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  let session: any = null;
  try {
    session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For Google OAuth users, session.user.id might not be set yet
    // Try to fetch by email as fallback
    let userId = session.user?.id;
    if (!userId && session.user?.email) {
      try {
        const userByEmail = await db.user.findByEmail(session.user.email);
        if (userByEmail) {
          userId = userByEmail.id;
          // Update session with the correct ID for future requests
          (session.user as any).id = userByEmail.id;
        } else {
          return NextResponse.json({ error: 'User not found', message: 'Your account is being set up. Please refresh the page in a moment.' }, { status: 404 });
        }
      } catch (error) {
        console.error('[Token Usage] Error fetching user by email:', error);
        return NextResponse.json({ error: 'Unauthorized', message: 'Failed to authenticate' }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized', message: 'User ID not found' }, { status: 401 });
    }

    const tokenStatus = await getTokenUsage(userId);
    
    // Also fetch user subscription info
    const user = await db.user.findById(userId);
    if (user) {
      // FIX: If user has payment_id or subscription_expires_at but is still marked as 'trial',
      // automatically upgrade them to 'paid' (webhook might have failed)
      if (user.userType === 'trial' && (user.paymentId || user.subscriptionExpiresAt)) {
        console.log(`[Token Usage] Auto-upgrading user ${userId} from trial to paid (has payment_id or subscription)`);
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
          
          const upgradedUser = await db.user.update(userId, {
            userType: 'paid',
            subscriptionStatus: (subscriptionExpiresAt && new Date(subscriptionExpiresAt) > new Date()) || hasActiveSubscription ? 'active' : user.subscriptionStatus || 'active',
            subscriptionExpiresAt: subscriptionExpiresAt || user.subscriptionExpiresAt,
          });
          if (upgradedUser) {
            // Update tokenStatus with the new userType
            tokenStatus.userType = 'paid';
            console.log(`[Token Usage] Successfully auto-upgraded user ${userId}`);
          }
        } catch (error) {
          console.error('[Token Usage] Error auto-upgrading user:', error);
          // Continue with original userType if update fails
        }
      }

      // Calculate subscription start date (30 days before expiration, or created_at if no expiration)
      let subscriptionStartDate: Date | null = null;
      const currentUser = await db.user.findById(userId); // Re-fetch to get updated userType
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
    
    // Check if it's a "User not found" error (common for new Google OAuth users)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('User not found') || errorMessage.includes('not found')) {
      // Try to fetch user by email as a fallback
      if (session?.user?.email) {
        try {
          const userByEmail = await db.user.findByEmail(session.user.email);
          if (userByEmail) {
            // Retry with the correct user ID
            const tokenStatus = await getTokenUsage(userByEmail.id);
            const currentUser = await db.user.findById(userByEmail.id);
            if (currentUser) {
              return NextResponse.json({
                ...tokenStatus,
                userType: currentUser.userType,
                subscriptionStatus: currentUser.subscriptionStatus,
                subscriptionExpiresAt: currentUser.subscriptionExpiresAt,
                subscriptionStartDate: null,
              });
            }
          }
        } catch (retryError) {
          console.error('Token usage retry error:', retryError);
        }
      }
      
      return NextResponse.json(
        { error: 'User not found', message: 'Your account is being set up. Please refresh the page in a moment.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch token usage', message: errorMessage },
      { status: 500 }
    );
  }
}

