import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
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

    const profile = await db.voiceProfile.findById(params.id);

    if (!profile) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Voice profile not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (profile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have access to this voice profile' },
        { status: 403 }
      );
    }

    // Fetch samples
    const samples = await db.voiceSample.findByProfileId(profile.id);

    return NextResponse.json({
      profile: {
        ...profile,
        samples,
      },
    });
  } catch (error) {
    console.error('Error fetching voice profile:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to fetch voice profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

    const profile = await db.voiceProfile.findById(params.id);
    if (!profile) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Voice profile not found' },
        { status: 404 }
      );
    }

    if (profile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have access to this voice profile' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updated = await db.voiceProfile.update(params.id, {
      name: body.name,
      doList: body.doList,
      dontList: body.dontList,
      styleRules: body.styleRules,
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('Error updating voice profile:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to update voice profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    const profile = await db.voiceProfile.findById(params.id);
    if (!profile) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Voice profile not found' },
        { status: 404 }
      );
    }

    if (profile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have access to this voice profile' },
        { status: 403 }
      );
    }

    await db.voiceProfile.delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting voice profile:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to delete voice profile' },
      { status: 500 }
    );
  }
}

