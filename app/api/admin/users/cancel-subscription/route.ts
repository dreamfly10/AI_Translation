import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertAdminSession } from '@/lib/admin';
import { db } from '@/lib/db';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { z } from 'zod';

const schema = z.object({
  userId: z.string().min(1),
  cancelNow: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    assertAdminSession(session);

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const body = schema.parse(await request.json());
    const user = await db.user.findById(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }
    if (!user.paymentId) {
      return NextResponse.json(
        { error: 'NO_STRIPE_CUSTOMER', message: 'User has no Stripe customer id (paymentId)' },
        { status: 400 }
      );
    }

    const subs = await stripe.subscriptions.list({
      customer: user.paymentId,
      status: 'active',
      limit: 5,
    });

    if (subs.data.length === 0) {
      return NextResponse.json(
        { error: 'NO_ACTIVE_SUBSCRIPTION', message: 'No active subscription found for customer' },
        { status: 400 }
      );
    }

    const subscription = subs.data[0];
    const updatedSubResp = body.cancelNow
      ? await stripe.subscriptions.cancel(subscription.id)
      : await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });

    const updatedSub = updatedSubResp as any;

    // Update DB to reflect cancellation intent.
    await db.user.update(user.id, {
      subscriptionStatus: 'cancelled',
      subscriptionExpiresAt: updatedSub.current_period_end
        ? new Date((updatedSub.current_period_end as number) * 1000)
        : user.subscriptionExpiresAt,
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      cancelNow: body.cancelNow,
      cancelAtPeriodEnd: updatedSub.cancel_at_period_end,
      currentPeriodEnd: updatedSub.current_period_end,
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

