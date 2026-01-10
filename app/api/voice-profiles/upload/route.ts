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

    const fileName = file.name.toLowerCase();
    let text = '';

    // Handle different file types
    if (fileName.endsWith('.docx')) {
      // Parse DOCX file using mammoth (dynamic import to avoid build issues)
      try {
        const mammoth = (await import('mammoth')).default;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
        
        if (!text || text.trim().length === 0) {
          return NextResponse.json(
            { error: 'EMPTY_FILE', message: 'The DOCX file appears to be empty or could not be parsed' },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('Error parsing DOCX file:', error);
        return NextResponse.json(
          { error: 'PARSE_ERROR', message: error instanceof Error ? error.message : 'Failed to parse DOCX file. Please ensure the file is a valid Word document.' },
          { status: 400 }
        );
      }
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      // Read plain text files
      text = await file.text();
      
      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          { error: 'EMPTY_FILE', message: 'The file appears to be empty' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'UNSUPPORTED_FORMAT', message: 'Unsupported file format. Please upload .txt, .md, or .docx files only.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      content: text.trim(),
      fileName: file.name,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
}

