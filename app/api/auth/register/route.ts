import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createErrorResponse } from '@/lib/error-handler';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.user.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with trial defaults
    const user = await db.user.create({
      email,
      password: hashedPassword,
      name,
      userType: 'trial',
      tokensUsed: 0,
      tokenLimit: 5000, // 5k tokens for trial users
    });

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      const errorMessage = firstError?.message || 'Invalid input';
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: errorMessage },
        { status: 400 }
      );
    }

    // All errors are sanitized - no backend details exposed
    return createErrorResponse(error, 'User Registration');
  }
}

