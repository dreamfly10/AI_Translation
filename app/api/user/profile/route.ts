import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const user = await db.user.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: user.name || null,
      email: user.email,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    const updatedUser = await db.user.update(session.user.id, {
      name: name || null,
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      name: updatedUser.name,
      email: updatedUser.email,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

