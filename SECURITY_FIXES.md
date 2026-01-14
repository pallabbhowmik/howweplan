-- Supabase Security Fixes
-- Run this ENTIRE file in the Supabase Dashboard SQL Editor.

-- =================================================================
-- 1. Enable RLS and Create Policies
-- =================================================================

-- Conversations (Policies already exist, just enable RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Messages (Needs RLS and Policies)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for Messages
-- Drop existing policies to avoid conflicts if re-running
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Agents can view messages" ON public.messages;
DROP POLICY IF EXISTS "Agents can insert messages" ON public.messages;

-- Allow users to view messages in their own conversations
CREATE POLICY "Users can view messages" ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
);

-- Allow users to insert messages in their own conversations
CREATE POLICY "Users can insert messages" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
);

-- Allow agents to view messages in assigned conversations
CREATE POLICY "Agents can view messages" ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.agents a ON c.agent_id = a.id
    WHERE c.id = conversation_id AND a.user_id = auth.uid()
  )
);

-- Allow agents to insert messages in assigned conversations
CREATE POLICY "Agents can insert messages" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversations c 
    JOIN public.agents a ON c.agent_id = a.id
    WHERE c.id = conversation_id AND a.user_id = auth.uid()
  )
);

-- Badge History
ALTER TABLE public.badge_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.badge_history;
CREATE POLICY "Allow read for authenticated" ON public.badge_history FOR SELECT TO authenticated USING (true);
-- No write policy created -> effectively read-only for authenticated users (except service role)

-- Review Eligibility
ALTER TABLE public.review_eligibility ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.review_eligibility;
CREATE POLICY "Allow read for authenticated" ON public.review_eligibility FOR SELECT TO authenticated USING (true);
-- No write policy created -> effectively read-only

-- =================================================================
-- 2. Fix Mutable Search Paths for Functions
-- =================================================================

ALTER FUNCTION public.update_updated_at_column SET search_path = public;
ALTER FUNCTION public.get_system_setting SET search_path = public;
ALTER FUNCTION public.update_system_setting SET search_path = public;
ALTER FUNCTION public.update_system_settings_timestamp SET search_path = public;
ALTER FUNCTION public.update_template_timestamp SET search_path = public;
ALTER FUNCTION public.update_app_settings_updated_at SET search_path = public;
ALTER FUNCTION public.update_wishlists_updated_at SET search_path = public;
ALTER FUNCTION public.update_agent_verification_tier SET search_path = public;
ALTER FUNCTION public.calculate_agent_risk_score SET search_path = public;
ALTER FUNCTION public.get_template_suggestions SET search_path = public;
ALTER FUNCTION public.record_template_usage SET search_path = public;
ALTER FUNCTION public.prevent_audit_modification SET search_path = public;
ALTER FUNCTION public.prevent_review_update SET search_path = public;
ALTER FUNCTION public.increment_agent_violation_count SET search_path = public;
ALTER FUNCTION public.recalculate_agent_review_stats SET search_path = public;
ALTER FUNCTION public.trigger_recalculate_agent_stats SET search_path = public;
ALTER FUNCTION public.get_response_time_label SET search_path = public;


-- =================================================================
-- 3. Harden Overly Permissive Policies
-- =================================================================

-- Agent Response Events
DROP POLICY IF EXISTS "Service role full access on response events" ON public.agent_response_events;
CREATE POLICY "Service role full access on response events" ON public.agent_response_events
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Agent Response Metrics
DROP POLICY IF EXISTS "Service role full access on response metrics" ON public.agent_response_metrics;
CREATE POLICY "Service role full access on response metrics" ON public.agent_response_metrics
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Destinations
-- Previous policy was too permissive. 
-- Destinations are global/public data, managed by admins.
DROP POLICY IF EXISTS "Authenticated users can manage destinations" ON public.destinations;
DROP POLICY IF EXISTS "Admins can manage destinations" ON public.destinations;

-- Allow read for everyone (it's a travel directory)
CREATE POLICY "Enable read access for all users" ON public.destinations
FOR SELECT TO authenticated, anon
USING (true);

-- Allow admins to insert/update/delete
CREATE POLICY "Admins can manage destinations" ON public.destinations
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Users
DROP POLICY IF EXISTS "Allow insert for registration" ON public.users;
CREATE POLICY "Allow insert for registration" ON public.users
FOR INSERT TO anon, authenticated
WITH CHECK (auth.uid() = id);

-- =================================================================
-- NOTE: Leaked Password Protection must be enabled in the Supabase 
-- Dashboard UI (Authentication -> Security).
-- =================================================================
