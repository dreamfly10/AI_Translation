import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assertAdminSession } from '@/lib/admin';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { z } from 'zod';

const schema = z.object({
  paymentIntentId: z.string().optional(),
  chargeId: z.string().optional(),
  invoiceId: z.string().optional(),
  amount: z.number().int().positive().optional(), // in cents
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
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

    let paymentIntentId = body.paymentIntentId;
    let chargeId = body.chargeId;

    if (!paymentIntentId && !chargeId && body.invoiceId) {
      const invoice = await stripe.invoices.retrieve(body.invoiceId, { expand: ['payment_intent'] });
      const pi = (invoice as any).payment_intent;
      paymentIntentId = typeof pi === 'string' ? pi : pi?.id;
    }

    if (!paymentIntentId && !chargeId) {
      return NextResponse.json(
        { error: 'MISSING_TARGET', message: 'Provide paymentIntentId, chargeId, or invoiceId' },
        { status: 400 }
      );
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      charge: chargeId,
      amount: body.amount,
      reason: body.reason,
    });

    return NextResponse.json({ success: true, refund });
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

