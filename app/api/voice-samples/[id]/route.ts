import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

    // Fetch the sample to get the profile ID
    const sample = await db.voiceSample.findById(params.id);
    
    if (!sample) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Voice sample not found' },
        { status: 404 }
      );
    }

    // Verify ownership through the profile
    const profile = await db.voiceProfile.findById(sample.voiceProfileId);
    if (!profile || profile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have access to this voice sample' },
        { status: 403 }
      );
    }

    // Check if deleting this sample would leave less than 3 samples
    const allSamples = await db.voiceSample.findByProfileId(sample.voiceProfileId);
    if (allSamples.length < 3) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_SAMPLES', message: 'Cannot delete sample. A profile must have at least 3 samples.' },
        { status: 400 }
      );
    }

    await db.voiceSample.delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting voice sample:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to delete voice sample' },
      { status: 500 }
    );
  }
}
