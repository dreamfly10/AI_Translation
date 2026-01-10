-- Migration: Add custom_prompt and profile_type fields to voice_profiles
-- Allows users to provide custom prompts/instructions instead of (or in addition to) writing samples

ALTER TABLE voice_profiles 
ADD COLUMN IF NOT EXISTS custom_prompt TEXT,
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'samples' CHECK (profile_type IN ('samples', 'prompt', 'both'));

-- Add comment for documentation
COMMENT ON COLUMN voice_profiles.custom_prompt IS 'Custom prompt/instructions provided by the user for style generation';
COMMENT ON COLUMN voice_profiles.profile_type IS 'Type of profile: samples (extract from samples), prompt (use custom prompt), or both (combine both)';
