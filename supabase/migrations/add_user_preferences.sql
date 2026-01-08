-- Migration: Add user preference columns to users table
-- Run this if your users table already exists

-- Add default_writing_style column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'default_writing_style'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN default_writing_style TEXT 
    CHECK (default_writing_style IS NULL OR default_writing_style IN ('warmBookish', 'lifeReflection', 'contrarian', 'education', 'science'));
  END IF;
END $$;

-- Add default_expression_variation column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'default_expression_variation'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN default_expression_variation TEXT 
    CHECK (default_expression_variation IS NULL OR default_expression_variation IN ('light', 'medium', 'heavy'));
  END IF;
END $$;

-- Add default_target_language column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'default_target_language'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN default_target_language TEXT DEFAULT 'zh' 
    CHECK (default_target_language IN ('zh', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'it', 'ru', 'ar'));
  END IF;
END $$;

-- Add show_language_toggle column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'show_language_toggle'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN show_language_toggle BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add default_ui_language column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'default_ui_language'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN default_ui_language TEXT DEFAULT 'en' 
    CHECK (default_ui_language IN ('en', 'zh'));
  END IF;
END $$;
