import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update user to paid status
    const updatedUser = await db.user.update(session.user.id, {
      userType: 'paid',
      tokenLimit: 100000, // 100k tokens for paid users per month
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to upgrade user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Upgraded to paid successfully',
      userType: 'paid',
      tokenLimit: updatedUser.tokenLimit,
      subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'UPGRADE_ERROR',
        message: 'Failed to upgrade',
        userMessage: 'Unable to upgrade your account. Please try again or contact support if the issue persists.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

