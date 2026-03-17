import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Get user to check if they have a Stripe customer ID
    const user = await db.user.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a payment ID (Stripe customer ID)
    let customerId = user.paymentId;

    if (!customerId) {
      // Try to find existing customer by email in Stripe
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        // Save the customer ID to the user record
        await db.user.update(session.user.id, {
          paymentId: customerId,
        });
      } else {
        // No customer found - return empty invoices
        return NextResponse.json({
          invoices: [],
        });
      }
    }

    // Fetch invoices for the customer
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 100, // Get up to 100 invoices
        expand: ['data.subscription'],
      });

      // Format invoices for the frontend
      const formattedInvoices = invoices.data.map((invoice) => ({
        id: invoice.id,
        payment_intent: (invoice as any).payment_intent || null,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        description: invoice.description || invoice.lines.data[0]?.description || null,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        number: invoice.number,
      }));

      // Sort by created date (newest first)
      formattedInvoices.sort((a, b) => (b.created || 0) - (a.created || 0));

      return NextResponse.json({
        invoices: formattedInvoices,
      });
    } catch (stripeError) {
      console.error('Error fetching invoices from Stripe:', stripeError);
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error';
      return NextResponse.json(
        { 
          error: 'STRIPE_ERROR', 
          message: 'Failed to fetch invoices from Stripe',
          userMessage: 'Unable to retrieve payment history. Please try again later or contact support if the issue persists.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}
