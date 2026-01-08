import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        error: 'DATABASE_UNAVAILABLE',
        message: 'Database is not available'
      }, { status: 500 });
    }

    const articleId = params.id;

    // Query article by ID and user_id (ensure user can only access their own articles)
    const { data, error } = await supabaseServer
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .eq('user_id', session.user.id)
      .single();

    // Handle database errors
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned (article not found or doesn't belong to user)
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'Article not found' },
          { status: 404 }
        );
      }
      
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'DATABASE_NOT_SETUP',
          message: 'Database table does not exist'
        }, { status: 500 });
      }
      
      console.error('Error fetching article:', error);
      return NextResponse.json({
        error: 'DATABASE_UNAVAILABLE',
        message: 'Failed to fetch article'
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Article not found' },
        { status: 404 }
      );
    }

    // Map database row to expected article format
    const article = {
      id: data.id,
      title: data.title || 'Untitled',
      inputType: data.input_type,
      sourceUrl: data.source_url || null,
      originalContent: data.original_content || null,
      translatedContent: data.translated_content || '',
      insights: data.insights || '',
      style: data.style || null,
      targetLanguage: data.target_language || 'zh',
      createdAt: data.created_at,
    };

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Unexpected error fetching article:', error);
    return NextResponse.json({
      error: 'DATABASE_UNAVAILABLE',
      message: 'Failed to fetch article'
    }, { status: 500 });
  }
}

