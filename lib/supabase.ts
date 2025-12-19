import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client-side client (uses anon key, respects RLS)
// This allows the app to start even if Supabase isn't configured yet
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Server-side client (uses service role key, bypasses RLS)
// This is for server-side operations like user registration, updates, etc.
// Only use this in API routes and server components, NEVER expose to client
export const supabaseServer = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceRoleKey || supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  const hasUrl = supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co';
  
  // Accept both legacy JWT format (eyJ...) and new publishable format (sb_publishable_...)
  const isLegacyJwt = supabaseAnonKey?.startsWith('eyJ');
  const isNewPublishable = supabaseAnonKey?.startsWith('sb_publishable_');
  const hasKey = supabaseAnonKey && 
                 supabaseAnonKey !== 'placeholder-key' &&
                 (isLegacyJwt || isNewPublishable);
  
  if (hasUrl && hasKey) {
    return true;
  }
  
  // Log what's wrong for debugging
  if (!hasUrl) {
    console.warn('Supabase URL is missing or invalid');
  }
  if (!hasKey) {
    console.warn('Supabase anon key is missing or invalid. It should start with "eyJ" (legacy) or "sb_publishable_" (new)');
  }
  
  return false;
}

