import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/error-handler';
import { Resend } from 'resend';
import crypto from 'crypto';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const OTP_EXPIRY_MINUTES = 15;
const MAX_REQUESTS_PER_HOUR = 3;

/**
 * Generate a secure 6-digit OTP
 */
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send OTP email using Resend
 */
async function sendOTPEmail(email: string, otp: string, name?: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Expression Copilot <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Your Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
          Password Reset Request
        </h2>
        <p style="color: #666; line-height: 1.6;">
          ${name ? `Hi ${name},` : 'Hi,'}
        </p>
        <p style="color: #666; line-height: 1.6;">
          You requested to reset your password for Expression Copilot. Use the code below to verify your identity:
        </p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 8px; font-family: monospace;">
            ${otp}
          </div>
        </div>
        <p style="color: #666; line-height: 1.6;">
          This code will expire in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, please ignore this email.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          This is an automated message from Expression Copilot. Please do not reply to this email.
        </p>
      </div>
    `,
    text: `
Password Reset Request

${name ? `Hi ${name},` : 'Hi,'}

You requested to reset your password for Expression Copilot. Use the code below to verify your identity:

${otp}

This code will expire in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, please ignore this email.

This is an automated message from Expression Copilot. Please do not reply to this email.
    `.trim(),
  });

  if (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send email');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Find user by email
    const user = await db.user.findByEmail(email);
    
    // For security, don't reveal if user exists or not
    // Always return success message, but only send email if user exists
    if (!user) {
      // Return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset code.',
      });
    }

    // Check if user has password (OAuth users can't reset password this way)
    if (!user.password) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset code.',
      });
    }

    // Rate limiting: Check if user has requested too many times
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    if (user.lastOtpRequestAt) {
      const lastRequest = new Date(user.lastOtpRequestAt);
      if (lastRequest > oneHourAgo) {
        // Count requests in the last hour (simplified - in production, you'd track this better)
        // For now, we'll allow if it's been at least 20 minutes since last request
        const minutesSinceLastRequest = (now.getTime() - lastRequest.getTime()) / (1000 * 60);
        if (minutesSinceLastRequest < 20) {
          return NextResponse.json({
            success: true,
            message: 'If an account with that email exists, we have sent a password reset code.',
          });
        }
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP to database
    await db.user.update(user.id, {
      otpCode: otp,
      otpExpiresAt: otpExpiresAt,
      otpAttempts: 0, // Reset attempts
      lastOtpRequestAt: now,
    });

    // Send OTP email
    try {
      await sendOTPEmail(user.email, otp, user.name || undefined);
      console.log(`[Password Reset] OTP sent to ${user.email}`);
    } catch (emailError) {
      console.error('[Password Reset] Error sending email:', emailError);
      // Clear OTP if email fails
      await db.user.update(user.id, {
        otpCode: undefined,
        otpExpiresAt: undefined,
      });
      throw new Error('Failed to send password reset email. Please try again later.');
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset code.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: firstError?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('[Password Reset] Error:', error);
    return createErrorResponse(error, 'Password Reset Request');
  }
}
