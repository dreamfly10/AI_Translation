import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTokenUsage } from '@/lib/token-tracker';
import { db } from '@/lib/db';

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
      // Calculate subscription start date (30 days before expiration, or created_at if no expiration)
      let subscriptionStartDate: Date | null = null;
      if (user.subscriptionExpiresAt) {
        const expiresAt = new Date(user.subscriptionExpiresAt);
        subscriptionStartDate = new Date(expiresAt.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before
      } else if (user.userType === 'paid') {
        // If paid but no expiration, use created_at as start
        subscriptionStartDate = new Date(user.createdAt);
      }

      return NextResponse.json({
        ...tokenStatus,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionStartDate: subscriptionStartDate,
      });
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

