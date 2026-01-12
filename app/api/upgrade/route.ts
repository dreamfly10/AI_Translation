import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { upgradeUserToPaid } from '@/lib/upgrade-user';
import { createErrorResponse } from '@/lib/error-handler';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Upgrade user to paid (transfers unused trial tokens)
    const updatedUser = await upgradeUserToPaid({
      userId: session.user.id,
      // No subscriptionExpiresAt - will default to 30 days from now
    });

    return NextResponse.json({ 
      success: true,
      message: 'Upgraded to paid successfully',
      userType: 'paid',
      tokenLimit: updatedUser.tokenLimit,
      subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    return createErrorResponse(error, 'Upgrade User');
  }
}

