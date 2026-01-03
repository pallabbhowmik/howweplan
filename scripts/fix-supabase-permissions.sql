-- ============================================================================
-- Fix Supabase Permissions for Identity Service
-- ============================================================================
-- Run this in Supabase SQL Editor to grant proper permissions.
-- This allows the service role to manage users and related tables.
-- ============================================================================

-- Disable RLS on tables that need service-level access
-- (The service role key bypasses RLS, but we need to ensure tables exist first)

-- Grant permissions to authenticated and service roles
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT ALL ON users TO anon;

GRANT ALL ON agent_profiles TO authenticated;
GRANT ALL ON agent_profiles TO service_role;

GRANT ALL ON refresh_tokens TO authenticated;
GRANT ALL ON refresh_tokens TO service_role;

GRANT ALL ON verification_tokens TO authenticated;
GRANT ALL ON verification_tokens TO service_role;

-- Grant usage on sequences (for auto-generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on users table (required for Supabase)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Allow insert for registration" ON users;

-- Policy: Service role bypasses RLS automatically, but we add explicit policy
CREATE POLICY "Service role has full access to users" ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Allow anyone to insert (for registration)
CREATE POLICY "Allow insert for registration" ON users
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = id::text OR auth.jwt()->>'role' = 'service_role');

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- ============================================================================
-- AGENT PROFILES RLS
-- ============================================================================

ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to agent_profiles" ON agent_profiles;
DROP POLICY IF EXISTS "Agents can read own profile" ON agent_profiles;
DROP POLICY IF EXISTS "Agents can update own profile" ON agent_profiles;

CREATE POLICY "Service role has full access to agent_profiles" ON agent_profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Agents can read own profile" ON agent_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Agents can update own profile" ON agent_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- ============================================================================
-- REFRESH TOKENS RLS
-- ============================================================================

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to refresh_tokens" ON refresh_tokens;

CREATE POLICY "Service role has full access to refresh_tokens" ON refresh_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- VERIFICATION TOKENS RLS
-- ============================================================================

ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to verification_tokens" ON verification_tokens;

CREATE POLICY "Service role has full access to verification_tokens" ON verification_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- ALTERNATIVE: DISABLE RLS COMPLETELY (USE IF ABOVE DOESN'T WORK)
-- ============================================================================
-- Uncomment these lines if you want to disable RLS entirely for these tables.
-- This is less secure but simpler for backend services.
-- 
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE agent_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE verification_tokens DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'Permissions and RLS policies configured successfully!' as result;
