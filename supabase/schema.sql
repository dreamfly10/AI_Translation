-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT, -- hashed password (nullable for OAuth users)
  name TEXT,
  image TEXT,
  user_type TEXT NOT NULL DEFAULT 'trial' CHECK (user_type IN ('trial', 'paid')),
  tokens_used BIGINT NOT NULL DEFAULT 0,
  token_limit BIGINT NOT NULL DEFAULT 5000, -- 5k tokens for trial users
  subscription_status TEXT CHECK (subscription_status IN ('active', 'expired', 'cancelled')),
  subscription_expires_at TIMESTAMPTZ,
  payment_id TEXT,
  -- User preferences
  default_writing_style TEXT CHECK (default_writing_style IS NULL OR default_writing_style IN ('warmBookish', 'lifeReflection', 'contrarian', 'education', 'science', 'editorialColumn', 'impactDecoder', 'neutralBrief')),
  default_expression_variation TEXT CHECK (default_expression_variation IN ('light', 'medium', 'heavy')),
  default_target_language TEXT DEFAULT 'zh' CHECK (default_target_language IN ('zh', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'it', 'ru', 'ar')),
  show_language_toggle BOOLEAN DEFAULT true,
  default_ui_language TEXT DEFAULT 'en' CHECK (default_ui_language IN ('en', 'zh')),
  enabled_thinking_styles JSONB DEFAULT '["warmBookish", "lifeReflection", "contrarian", "education", "science", "editorialColumn", "impactDecoder", "neutralBrief"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on user_type for filtering
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Create policy: Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Note: For server-side operations, you may need to disable RLS or create service role policies
-- This depends on whether you're using Supabase Auth or NextAuth

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  input_type TEXT NOT NULL CHECK (input_type IN ('url', 'text', 'video')),
  source_url TEXT,
  original_content TEXT NOT NULL,
  translated_content TEXT NOT NULL,
  insights TEXT NOT NULL,
  style TEXT CHECK (style IS NULL OR style IN ('warmBookish', 'lifeReflection', 'contrarian', 'education', 'science', 'editorialColumn', 'impactDecoder', 'neutralBrief')),
  target_language TEXT DEFAULT 'zh' CHECK (target_language IN ('zh', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'it', 'ru', 'ar')),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- Create trigger to automatically update updated_at for articles
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Voice Profiles Table
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sliders_json JSONB,
  do_list TEXT[],
  dont_list TEXT[],
  style_rules JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Voice Samples Table
CREATE TABLE IF NOT EXISTS voice_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_profile_id UUID NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  word_count INTEGER,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for voice profiles
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id ON voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_samples_profile_id ON voice_samples(voice_profile_id);

-- Trigger to automatically update updated_at for voice_profiles
CREATE TRIGGER update_voice_profiles_updated_at BEFORE UPDATE ON voice_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for voice profiles
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_samples ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_profiles
CREATE POLICY "Users can view own voice profiles" ON voice_profiles
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own voice profiles" ON voice_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own voice profiles" ON voice_profiles
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own voice profiles" ON voice_profiles
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for voice_samples
CREATE POLICY "Users can view own voice samples" ON voice_samples
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM voice_profiles 
      WHERE voice_profiles.id = voice_samples.voice_profile_id 
      AND voice_profiles.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own voice samples" ON voice_samples
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM voice_profiles 
      WHERE voice_profiles.id = voice_samples.voice_profile_id 
      AND voice_profiles.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own voice samples" ON voice_samples
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM voice_profiles 
      WHERE voice_profiles.id = voice_samples.voice_profile_id 
      AND voice_profiles.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own voice samples" ON voice_samples
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM voice_profiles 
      WHERE voice_profiles.id = voice_samples.voice_profile_id 
      AND voice_profiles.user_id::text = auth.uid()::text
    )
  );

-- Note: RLS is not enabled for articles table since we're using NextAuth
-- Server-side code handles authorization by filtering by user_id

