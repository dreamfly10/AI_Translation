import { NextResponse } from 'next/server';

export async function GET() {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    STRIPE_PRICE_ID_10K: process.env.STRIPE_PRICE_ID_10K 
      ? `${process.env.STRIPE_PRICE_ID_10K.substring(0, 10)}... (${process.env.STRIPE_PRICE_ID_10K.length} chars)` 
      : 'NOT SET',
    STRIPE_PRICE_ID_50K: process.env.STRIPE_PRICE_ID_50K 
      ? `${process.env.STRIPE_PRICE_ID_50K.substring(0, 10)}... (${process.env.STRIPE_PRICE_ID_50K.length} chars)` 
      : 'NOT SET',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY 
      ? `${process.env.STRIPE_SECRET_KEY.substring(0, 10)}... (configured)` 
      : 'NOT SET',
  });
}

