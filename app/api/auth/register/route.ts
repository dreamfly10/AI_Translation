import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { z } from 'zod';

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
      tokenLimit: 100000, // 100k tokens for trial users
    });

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Internal server error';
    let errorDetails: any = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        message: error.message,
        name: error.name,
      };
      
      // Check for specific Supabase errors
      if (error.message.includes('Supabase is not configured')) {
        errorMessage = 'Database not configured. Please check your Supabase settings in .env.local';
      } else if (error.message.includes('JWT') || error.message.includes('Invalid API key')) {
        errorMessage = 'Invalid Supabase API key. Please check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. It should start with "eyJ" (legacy) or "sb_publishable_" (new format)';
      } else if (error.message.includes('does not exist')) {
        errorMessage = 'Database table does not exist. Please run the SQL schema from supabase/schema.sql in your Supabase SQL Editor.';
      }
    }
    
    // Log full error for debugging (server-side only)
    console.error('Full error details:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...errorDetails
      },
      { status: 500 }
    );
  }
}

