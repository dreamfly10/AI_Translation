import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';
import { z } from 'zod';

const createVoiceProfileSchema = z.object({
  name: z.string().min(1).max(100),
  samples: z.array(z.string().min(1)).max(10).optional(),
  customPrompt: z.string().min(1).optional(),
  profileType: z.enum(['samples', 'prompt', 'both']).optional().default('samples'),
  doList: z.array(z.string()).optional(),
  dontList: z.array(z.string()).optional(),
});

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

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        error: 'DATABASE_UNAVAILABLE',
        profiles: [],
      });
    }

    const profiles = await db.voiceProfile.findByUserId(session.user.id);

    // Fetch samples for each profile
    const profilesWithSamples = await Promise.all(
      profiles.map(async (profile) => {
        const samples = await db.voiceSample.findByProfileId(profile.id);
        return {
          ...profile,
          samples: samples.map(s => ({
            id: s.id,
            content: s.content.substring(0, 200) + '...', // Preview only
            wordCount: s.wordCount,
            platform: s.platform,
          })),
          sampleCount: samples.length,
        };
      })
    );

    return NextResponse.json({ profiles: profilesWithSamples });
  } catch (error) {
    console.error('Error fetching voice profiles:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to fetch voice profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'DATABASE_UNAVAILABLE', message: 'Database is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, samples, customPrompt, profileType, doList, dontList } = createVoiceProfileSchema.parse(body);

    // Validate based on profile type
    if (profileType === 'samples' && (!samples || samples.length === 0)) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'At least one sample is required for samples profile type' },
        { status: 400 }
      );
    }

    if (profileType === 'prompt' && (!customPrompt || !customPrompt.trim())) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Custom prompt is required for prompt profile type' },
        { status: 400 }
      );
    }

    if (profileType === 'both' && ((!samples || samples.length === 0) || (!customPrompt || !customPrompt.trim()))) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Both samples and custom prompt are required for "both" profile type' },
        { status: 400 }
      );
    }

    // Create voice profile
    const profile = await db.voiceProfile.create({
      userId: session.user.id,
      name,
      customPrompt: customPrompt?.trim() || undefined,
      profileType: profileType || 'samples',
      doList: doList || [],
      dontList: dontList || [],
    });

    // Create voice samples only if samples are provided
    const createdSamples = samples && samples.length > 0
      ? await Promise.all(
          samples.map((content) =>
            db.voiceSample.create({
              voiceProfileId: profile.id,
              content,
            })
          )
        )
      : [];

    return NextResponse.json({
      profile: {
        ...profile,
        samples: createdSamples,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating voice profile:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to create voice profile';
    let userMessage = 'Failed to create voice profile. Please try again.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific database errors
      if (error.message.includes('custom_prompt') || error.message.includes('profile_type')) {
        userMessage = 'Database migration required. Please run the migration from supabase/migrations/add_custom_prompt_to_voice_profiles.sql in your Supabase SQL Editor.';
      } else if (error.message.includes('does not exist')) {
        userMessage = 'Database table or column does not exist. Please run the database migrations in your Supabase SQL Editor.';
      } else if (error.message.includes('Supabase is not configured')) {
        userMessage = 'Database is not configured. Please check your Supabase settings in .env.local';
      }
    }
    
    return NextResponse.json(
      { 
        error: 'SERVER_ERROR', 
        message: errorMessage,
        userMessage: userMessage
      },
      { status: 500 }
    );
  }
}

