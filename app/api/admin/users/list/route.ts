import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertAdminSession } from '@/lib/admin';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertAdminSession(session);

    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const users = await db.user.list({ query, limit, offset });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name || null,
        userType: u.userType,
        tokenLimit: u.tokenLimit,
        tokensUsed: u.tokensUsed,
        subscriptionStatus: u.subscriptionStatus || null,
        subscriptionExpiresAt: u.subscriptionExpiresAt || null,
        paymentId: u.paymentId || null,
        createdAt: u.createdAt,
      })),
      limit,
      offset,
      query,
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: statusCode === 403 ? 'FORBIDDEN' : 'SERVER_ERROR',
        message,
      },
      { status: statusCode }
    );
  }
}

