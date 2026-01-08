import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'NO_FILE', message: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();
    
    // Basic validation
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 200) {
      return NextResponse.json(
        { error: 'TOO_SHORT', message: 'File must contain at least 200 words' },
        { status: 400 }
      );
    }
    if (wordCount > 8000) {
      return NextResponse.json(
        { error: 'TOO_LONG', message: 'File must contain at most 8000 words' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      content: text,
      wordCount,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to process file' },
      { status: 500 }
    );
  }
}

