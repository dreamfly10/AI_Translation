-- Migration: Add target_language column to articles table
-- Run this if your articles table already exists

-- Add target_language column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'target_language'
  ) THEN
    ALTER TABLE articles 
    ADD COLUMN target_language TEXT DEFAULT 'zh' 
    CHECK (target_language IN ('zh', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'it', 'ru', 'ar'));
  END IF;
END $$;

-- Ensure original_content is NOT NULL (if not already)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'original_content' AND is_nullable = 'YES'
  ) THEN
    -- Update any NULL values first
    UPDATE articles SET original_content = '' WHERE original_content IS NULL;
    -- Then make it NOT NULL
    ALTER TABLE articles ALTER COLUMN original_content SET NOT NULL;
  END IF;
END $$;

-- Ensure tokens_used column exists (if not already)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'tokens_used'
  ) THEN
    ALTER TABLE articles ADD COLUMN tokens_used INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add style constraint if not exists
DO $$ 
BEGIN
  -- Check if constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'articles' 
    AND constraint_name = 'articles_style_check'
  ) THEN
    ALTER TABLE articles 
    ADD CONSTRAINT articles_style_check 
    CHECK (style IS NULL OR style IN ('warmBookish', 'lifeReflection', 'contrarian', 'education', 'science'));
  END IF;
END $$;
