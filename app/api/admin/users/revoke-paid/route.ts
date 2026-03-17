import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertAdminSession } from '@/lib/admin';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  userId: z.string().min(1),
  resetTokenLimitToTrial: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertAdminSession(session);

    const body = schema.parse(await request.json());
    const user = await db.user.findById(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    const updated = await db.user.update(body.userId, {
      userType: 'trial',
      subscriptionStatus: 'cancelled',
      subscriptionExpiresAt: new Date(),
      tokenLimit: body.resetTokenLimitToTrial ? 5000 : user.tokenLimit,
    });

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || (error instanceof z.ZodError ? 400 : 500);
    const message =
      error instanceof z.ZodError ? 'INVALID_INPUT' : error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: statusCode === 403 ? 'FORBIDDEN' : 'SERVER_ERROR', message },
      { status: statusCode }
    );
  }
}

