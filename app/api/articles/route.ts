import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseServer, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', articles: [] },
        { status: 401 }
      );
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        error: 'DATABASE_UNAVAILABLE',
        articles: []
      });
    }

    // Get pagination params from query
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

    // First, get total count for pagination
    let totalArticles = 0;
    try {
      const { count, error: countError } = await supabaseServer
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (countError) {
        console.error('Error counting articles:', countError);
        // If count fails, try to get count from actual query result
        // This ensures pagination info is still available even if count query fails
      } else {
        totalArticles = count || 0;
      }
    } catch (countErr) {
      console.error('Error in count query:', countErr);
      // Continue with totalArticles = 0, will be corrected by actual query result
    }

    const totalPages = Math.max(1, Math.ceil(totalArticles / limit));

    // Query articles for the current user with pagination
    let data, error;
    try {
      const result = await supabaseServer
        .from('articles')
        .select('id, title, created_at, input_type, source_url, style')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      data = result.data;
      error = result.error;
    } catch (queryErr) {
      console.error('Error executing articles query:', queryErr);
      const errorMessage = queryErr instanceof Error ? queryErr.message : String(queryErr);
      if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED')) {
        return NextResponse.json({
          error: 'DATABASE_UNAVAILABLE',
          message: 'Database connection failed',
          articles: [],
          pagination: { page: 1, limit, totalArticles: 0, totalPages: 1 }
        }, { status: 500 });
      }
      return NextResponse.json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch articles',
        articles: [],
        pagination: { page: 1, limit, totalArticles: 0, totalPages: 1 }
      }, { status: 500 });
    }

    // Handle database errors
    if (error) {
      console.error('Error fetching articles:', error);
      
      // Check if it's a table missing error
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return NextResponse.json({
          error: 'DATABASE_NOT_SETUP',
          message: 'Articles table does not exist',
          articles: [],
          pagination: { page: 1, limit, totalArticles: 0, totalPages: 1 }
        });
      }
      
      // Check if it's a connection error
      if (error.message?.includes('connect') || error.message?.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
        return NextResponse.json({
          error: 'DATABASE_UNAVAILABLE',
          message: 'Database connection failed. Please check your Supabase configuration.',
          articles: [],
          pagination: { page: 1, limit, totalArticles: 0, totalPages: 1 }
        }, { status: 500 });
      }
      
      return NextResponse.json({
        error: 'DATABASE_ERROR',
        message: `Failed to fetch articles: ${error.message || 'Unknown error'}`,
        articles: [],
        pagination: { page: 1, limit, totalArticles: 0, totalPages: 1 }
      }, { status: 500 });
    }

    // Map database rows to Article interface
    const articles = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title || 'Untitled',
      createdAt: row.created_at,
      inputType: row.input_type,
      sourceUrl: row.source_url,
      style: row.style
    }));

    // If count query failed but we have data, use data length as fallback for current page
    // Note: This is not perfect but better than showing 0 when articles exist
    const actualTotalArticles = totalArticles > 0 ? totalArticles : (articles.length > 0 ? articles.length : 0);
    const actualTotalPages = Math.max(1, Math.ceil(actualTotalArticles / limit));

    return NextResponse.json({ 
      articles,
      pagination: {
        page,
        limit,
        totalArticles: actualTotalArticles,
        totalPages: actualTotalPages
      }
    });
  } catch (error) {
    console.error('Unexpected error fetching articles:', error);
    return NextResponse.json({
      error: 'DATABASE_UNAVAILABLE',
      articles: []
    });
  }
}

