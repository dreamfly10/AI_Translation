import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const preferencesSchema = z.object({
  defaultWritingStyle: z.union([
    z.enum(['warmBookish', 'lifeReflection', 'contrarian', 'education', 'science']),
    z.literal(''),
    z.null()
  ]).optional().transform(val => val === '' ? null : val),
  defaultExpressionVariation: z.union([
    z.enum(['light', 'medium', 'heavy']),
    z.literal(''),
    z.null()
  ]).optional().transform(val => val === '' ? null : val),
  defaultTargetLanguage: z.enum(['zh', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'it', 'ru', 'ar']).optional().default('zh'),
  showLanguageToggle: z.boolean().optional(),
  defaultUILanguage: z.enum(['en', 'zh']).optional().default('en'),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const user = await db.user.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      defaultWritingStyle: user.defaultWritingStyle || null,
      defaultExpressionVariation: user.defaultExpressionVariation || null,
      defaultTargetLanguage: user.defaultTargetLanguage || 'zh',
      showLanguageToggle: user.showLanguageToggle !== undefined ? user.showLanguageToggle : true,
      defaultUILanguage: user.defaultUILanguage || 'en',
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to fetch user preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const preferences = preferencesSchema.parse(body);

    let updatedUser;
        try {
          updatedUser = await db.user.update(session.user.id, {
            defaultWritingStyle: preferences.defaultWritingStyle ?? undefined,
            defaultExpressionVariation: preferences.defaultExpressionVariation ?? undefined,
            defaultTargetLanguage: preferences.defaultTargetLanguage,
            showLanguageToggle: preferences.showLanguageToggle,
            defaultUILanguage: preferences.defaultUILanguage,
          });

      if (!updatedUser) {
        return NextResponse.json(
          { error: 'USER_NOT_FOUND', message: 'User not found' },
          { status: 404 }
        );
      }
    } catch (dbError: any) {
      console.error('Database error updating preferences:', dbError);
      // Check if it's a column doesn't exist error
      if (dbError?.message?.includes('column') || dbError?.code === '42703') {
        return NextResponse.json(
          { 
            error: 'DATABASE_SCHEMA_ERROR', 
            message: 'Database column missing. Please run the migration script: supabase/migrations/add_user_preferences.sql',
            details: dbError.message
          },
          { status: 500 }
        );
      }
      throw dbError; // Re-throw to be caught by outer catch
    }

    return NextResponse.json({
      success: true,
      preferences: {
        defaultWritingStyle: updatedUser.defaultWritingStyle || null,
        defaultExpressionVariation: updatedUser.defaultExpressionVariation || null,
        defaultTargetLanguage: updatedUser.defaultTargetLanguage || 'zh',
        showLanguageToggle: updatedUser.showLanguageToggle !== undefined ? updatedUser.showLanguageToggle : true,
        defaultUILanguage: updatedUser.defaultUILanguage || 'en',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid preferences data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating user preferences:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'SERVER_ERROR', 
        message: `Failed to update user preferences: ${errorMessage}`,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
