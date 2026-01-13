import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/error-handler';
import bcrypt from 'bcryptjs';

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resetToken, newPassword } = resetPasswordSchema.parse(body);

    // Find user by reset token
    // Note: We need to query by reset_token, which requires a custom query
    // For now, we'll need to add a findByResetToken method or query directly
    // Let's query all users with this token (should be unique)
    const { supabaseServer } = await import('@/lib/supabase');
    
    const { data: users, error: queryError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('reset_token', resetToken)
      .limit(1);

    if (queryError || !users || users.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Invalid or expired reset token.' },
        { status: 400 }
      );
    }

    const userRow = users[0];
    const user = await db.user.findById(userRow.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Invalid or expired reset token.' },
        { status: 400 }
      );
    }

    // Check if reset token exists and is valid
    if (!user.resetToken || user.resetToken !== resetToken) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Invalid or expired reset token.' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (!user.resetTokenExpiresAt) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Invalid or expired reset token.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const tokenExpiresAt = new Date(user.resetTokenExpiresAt);
    if (now > tokenExpiresAt) {
      // Clear expired token
      await db.user.update(user.id, {
        resetToken: null,
        resetTokenExpiresAt: null,
      });
      return NextResponse.json(
        { error: 'TOKEN_EXPIRED', message: 'Reset token has expired. Please request a new password reset.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await db.user.update(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiresAt: null,
    });

    console.log(`[Password Reset] Password reset successful for ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: firstError?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    console.error('[Reset Password] Error:', error);
    return createErrorResponse(error, 'Reset Password');
  }
}
