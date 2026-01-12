import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';
import { z } from 'zod';
import { createNextErrorResponse, ErrorCodes } from '@/lib/error-handler';

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
      const firstError = error.errors[0];
      const errorMessage = firstError?.message || 'Invalid input';
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: errorMessage },
        { status: 400 }
      );
    }
    
    // All errors are sanitized - no backend details exposed
    const sanitized = createNextErrorResponse(error, 'Voice Profile Creation');
    return NextResponse.json({ error: sanitized.error, message: sanitized.message }, { status: sanitized.status });
  }
}

