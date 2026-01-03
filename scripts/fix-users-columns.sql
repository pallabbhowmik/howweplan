-- ============================================================================
-- Fix Missing Users Table Columns and Identity Service Tables
-- ============================================================================
-- Run this in Supabase SQL Editor to add missing columns and tables required
-- by the identity service.
-- Safe to run multiple times.
-- ============================================================================

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending_verification';
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Create index on status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Update existing users to have 'active' status if they were previously active
UPDATE users 
SET status = 'active' 
WHERE status IS NULL AND is_active = TRUE;

UPDATE users 
SET status = 'suspended' 
WHERE status IS NULL AND is_banned = TRUE;

UPDATE users 
SET status = 'pending_verification' 
WHERE status IS NULL;

-- Set email_verified_at for users that have email_verified = true
UPDATE users 
SET email_verified_at = created_at 
WHERE email_verified = TRUE AND email_verified_at IS NULL;

-- ============================================================================
-- AGENT PROFILES (Identity Service)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SUBMITTED' 
        CHECK (verification_status IN ('NOT_SUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REVOKED')),
    verification_submitted_at TIMESTAMP WITH TIME ZONE,
    verification_completed_at TIMESTAMP WITH TIME ZONE,
    verification_rejected_reason TEXT,
    business_name VARCHAR(200),
    bio TEXT,
    specialties TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_verification_status ON agent_profiles(verification_status);

-- ============================================================================
-- REFRESH TOKENS (Identity Service)
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    device_id VARCHAR(255),
    device_name VARCHAR(255),
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================================================
-- VERIFICATION TOKENS (Identity Service)
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('EMAIL', 'PHONE', 'PASSWORD_RESET', 'EMAIL_CHANGE')),
    target VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    code_hash VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token_hash ON verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_type ON verification_tokens(type);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'Schema migration completed successfully!' as result;
