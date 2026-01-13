import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/error-handler';
import crypto from 'crypto';

const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const MAX_OTP_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Generate a secure reset token
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = verifyOTPSchema.parse(body);

    // Find user by email
    const user = await db.user.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'INVALID_OTP', message: 'Invalid or expired OTP code.' },
        { status: 400 }
      );
    }

    // Check if user has password (OAuth users)
    if (!user.password) {
      return NextResponse.json(
        { error: 'INVALID_OTP', message: 'Invalid or expired OTP code.' },
        { status: 400 }
      );
    }

    // Check if OTP exists
    if (!user.otpCode || !user.otpExpiresAt) {
      return NextResponse.json(
        { error: 'NO_OTP', message: 'No OTP code found. Please request a new password reset.' },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    const now = new Date();
    const otpExpiresAt = new Date(user.otpExpiresAt);
    if (now > otpExpiresAt) {
      // Clear expired OTP
      await db.user.update(user.id, {
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      });
      return NextResponse.json(
        { error: 'OTP_EXPIRED', message: 'OTP code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if too many attempts
    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      // Clear OTP after max attempts
      await db.user.update(user.id, {
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      });
      return NextResponse.json(
        { error: 'MAX_ATTEMPTS', message: 'Too many failed attempts. Please request a new OTP code.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (user.otpCode !== otp) {
      // Increment attempts
      const newAttempts = (user.otpAttempts || 0) + 1;
      await db.user.update(user.id, {
        otpAttempts: newAttempts,
      });

      const remainingAttempts = MAX_OTP_ATTEMPTS - newAttempts;
      return NextResponse.json(
        { 
          error: 'INVALID_OTP', 
          message: `Invalid OTP code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.` : 'Please request a new OTP code.'}` 
        },
        { status: 400 }
      );
    }

    // OTP is valid - generate reset token
    const resetToken = generateResetToken();

    // Save reset token and clear OTP
    await db.user.update(user.id, {
      resetToken: resetToken,
      resetTokenExpiresAt: new Date(now.getTime() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    });

    console.log(`[Password Reset] OTP verified for ${user.email}`);

    return NextResponse.json({
      success: true,
      resetToken: resetToken,
      message: 'OTP verified successfully. You can now reset your password.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: firstError?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('[Verify OTP] Error:', error);
    return createErrorResponse(error, 'Verify OTP');
  }
}
