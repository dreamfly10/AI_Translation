-- Migration: Add enabled_thinking_styles column to users table
-- This allows users to hide/show default thinking styles in the dropdown

-- Add enabled_thinking_styles column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'enabled_thinking_styles'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN enabled_thinking_styles JSONB DEFAULT '["warmBookish", "lifeReflection", "contrarian", "education", "science", "editorialColumn", "impactDecoder", "neutralBrief"]'::jsonb;
  END IF;
END $$;

-- Update existing users to have all styles enabled by default
UPDATE users 
SET enabled_thinking_styles = '["warmBookish", "lifeReflection", "contrarian", "education", "science", "editorialColumn", "impactDecoder", "neutralBrief"]'::jsonb
WHERE enabled_thinking_styles IS NULL;

-- Update CHECK constraint for default_writing_style to include new styles
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_default_writing_style_check;
  
  -- Add new constraint with all styles
  ALTER TABLE users 
  ADD CONSTRAINT users_default_writing_style_check 
  CHECK (default_writing_style IS NULL OR default_writing_style IN ('warmBookish', 'lifeReflection', 'contrarian', 'education', 'science', 'editorialColumn', 'impactDecoder', 'neutralBrief'));
END $$;

-- Update CHECK constraint for articles.style to include new styles
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_style_check;
  
  -- Add new constraint with all styles
  ALTER TABLE articles 
  ADD CONSTRAINT articles_style_check 
  CHECK (style IS NULL OR style IN ('warmBookish', 'lifeReflection', 'contrarian', 'education', 'science', 'editorialColumn', 'impactDecoder', 'neutralBrief'));
END $$;
