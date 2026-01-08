import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';
import { z } from 'zod';

const createVoiceProfileSchema = z.object({
  name: z.string().min(1).max(100),
  samples: z.array(z.string().min(200).max(8000)).min(3).max(10),
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
    const { name, samples, doList, dontList } = createVoiceProfileSchema.parse(body);

    // Create voice profile
    const profile = await db.voiceProfile.create({
      userId: session.user.id,
      name,
      doList: doList || [],
      dontList: dontList || [],
    });

    // Create voice samples
    const createdSamples = await Promise.all(
      samples.map((content) =>
        db.voiceSample.create({
          voiceProfileId: profile.id,
          content,
          wordCount: content.split(/\s+/).length,
        })
      )
    );

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
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to create voice profile' },
      { status: 500 }
    );
  }
}

