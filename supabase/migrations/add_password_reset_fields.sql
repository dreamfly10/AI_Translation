-- Add password reset and OTP fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_otp_request_at TIMESTAMPTZ;

-- Create index on reset_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- Create index on otp_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_otp_code ON users(otp_code) WHERE otp_code IS NOT NULL;
