import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

    // Get user to check subscription status
    const user = await db.user.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    if (user.userType !== 'paid') {
      return NextResponse.json(
        { 
          error: 'NOT_PAID_USER',
          message: 'You do not have an active subscription to cancel.',
        },
        { status: 400 }
      );
    }

    // Update user subscription status to cancelled
    // Note: In a production app, you'd also cancel the subscription in Stripe
    // For now, we'll just mark it as cancelled in the database
    const updatedUser = await db.user.update(session.user.id, {
      subscriptionStatus: 'cancelled',
      // Optionally, you could also revert to trial status
      // userType: 'trial',
      // tokenLimit: 100000, // Reset to trial limit
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'FAILED_TO_CANCEL', message: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscriptionStatus: updatedUser.subscriptionStatus,
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'CANCEL_SUBSCRIPTION_ERROR',
        message: 'Failed to cancel subscription',
        userMessage: 'Unable to cancel subscription. Please try again or contact support if the issue persists.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

