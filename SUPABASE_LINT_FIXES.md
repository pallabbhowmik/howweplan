# Supabase Performance and Security Fixes

Run the following SQL commands in your Supabase Dashboard SQL Editor to resolve the reported linter issues.

## 1. Add Missing Indexes (Foreign Keys)
These indexes are required to satisfy the `unindexed_foreign_keys` warnings and improve join performance.

```sql
-- agent_response_events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_response_events_request_id ON public.agent_response_events(request_id);

-- agent_stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_stats_frozen_by ON public.agent_stats(frozen_by);

-- badge_history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_badge_history_admin_id ON public.badge_history(admin_id);

-- bookings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_itinerary_id ON public.bookings(itinerary_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_request_id ON public.bookings(request_id);

-- call_masking_sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_masking_sessions_agent_id ON public.call_masking_sessions(agent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_masking_sessions_user_id ON public.call_masking_sessions(user_id);

-- dispute_evidence
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dispute_evidence_submitted_by ON public.dispute_evidence(submitted_by);

-- disputes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_agent_id ON public.disputes(agent_id);

-- payments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- review_eligibility
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_eligibility_agent_id ON public.review_eligibility(agent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_eligibility_review_id ON public.review_eligibility(review_id);

-- reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);

-- trust_reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trust_reviews_hidden_by ON public.trust_reviews(hidden_by);

-- verification_audit_log
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_audit_log_performed_by ON public.verification_audit_log(performed_by);

-- violations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violations_booking_id ON public.violations(booking_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violations_reported_by ON public.violations(reported_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violations_resolved_by ON public.violations(resolved_by);

-- whatsapp_verifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_verifications_reviewed_by ON public.whatsapp_verifications(reviewed_by);
```

## 2. Optimize RLS Policies (InitPlan & Consolidation)
These updates fix `auth_rls_initplan` warnings by wrapping `auth.uid()` in `(select ...)` and consolidate duplicate policies to resolve `multiple_permissive_policies`.

```sql
-- violations
DROP POLICY IF EXISTS "violations_select" ON public.violations;
CREATE POLICY "violations_select" ON public.violations FOR SELECT TO authenticated
USING (agent_id = (select auth.uid()));

-- agent_response_events
DROP POLICY IF EXISTS "Agents can view their own response events" ON public.agent_response_events;
CREATE POLICY "Agents can view their own response events" ON public.agent_response_events FOR SELECT TO authenticated
USING (agent_id = (select auth.uid()));

-- wishlists
DROP POLICY IF EXISTS "wishlists_select_own" ON public.wishlists;
CREATE POLICY "wishlists_select_own" ON public.wishlists FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "wishlists_insert_own" ON public.wishlists;
CREATE POLICY "wishlists_insert_own" ON public.wishlists FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "wishlists_update_own" ON public.wishlists;
CREATE POLICY "wishlists_update_own" ON public.wishlists FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "wishlists_delete_own" ON public.wishlists;
CREATE POLICY "wishlists_delete_own" ON public.wishlists FOR DELETE TO authenticated
USING (user_id = (select auth.uid()));

-- agent_stats
DROP POLICY IF EXISTS "agent_stats_select_own" ON public.agent_stats;
CREATE POLICY "agent_stats_select_own" ON public.agent_stats FOR SELECT TO authenticated
USING (agent_id = (select auth.uid()));

DROP POLICY IF EXISTS "agent_stats_update_service" ON public.agent_stats;
CREATE POLICY "agent_stats_update_service" ON public.agent_stats FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- notifications
DROP POLICY IF EXISTS "notifications_user_select_policy" ON public.notifications;
CREATE POLICY "notifications_user_select_policy" ON public.notifications FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notifications_user_update_policy" ON public.notifications;
CREATE POLICY "notifications_user_update_policy" ON public.notifications FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()));

-- trust_reviews
DROP POLICY IF EXISTS "trust_reviews_select" ON public.trust_reviews;
CREATE POLICY "trust_reviews_select" ON public.trust_reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "trust_reviews_insert" ON public.trust_reviews;
CREATE POLICY "trust_reviews_insert" ON public.trust_reviews FOR INSERT TO authenticated
WITH CHECK (reviewer_id = (select auth.uid()));

DROP POLICY IF EXISTS "trust_reviews_update_admin" ON public.trust_reviews;
CREATE POLICY "trust_reviews_update_admin" ON public.trust_reviews FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'));

-- travel_requests
DROP POLICY IF EXISTS "Users can update own requests" ON public.travel_requests;
CREATE POLICY "Users can update own requests" ON public.travel_requests FOR UPDATE TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own requests" ON public.travel_requests;
CREATE POLICY "Users can read own requests" ON public.travel_requests FOR SELECT TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create requests" ON public.travel_requests;
CREATE POLICY "Users can create requests" ON public.travel_requests FOR INSERT TO authenticated
WITH CHECK (user_id = (select auth.uid()));

-- users
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT TO authenticated
USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE TO authenticated
USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Allow insert for registration" ON public.users;
CREATE POLICY "Allow insert for registration" ON public.users FOR INSERT TO anon, authenticated
WITH CHECK (id = (select auth.uid()));

-- agent_profiles
DROP POLICY IF EXISTS "Agents can read own profile" ON public.agent_profiles;
CREATE POLICY "Agents can read own profile" ON public.agent_profiles FOR SELECT TO authenticated
USING (agent_id = (select auth.uid()));

DROP POLICY IF EXISTS "Agents can update own profile" ON public.agent_profiles;
CREATE POLICY "Agents can update own profile" ON public.agent_profiles FOR UPDATE TO authenticated
USING (agent_id = (select auth.uid()));

-- conversations (Consolidated + Optimized)
DROP POLICY IF EXISTS "service_role_all" ON public.conversations;
CREATE POLICY "service_role_all" ON public.conversations FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_read_own" ON public.conversations;
DROP POLICY IF EXISTS "agents_read_own" ON public.conversations;
CREATE POLICY "participants_read_own" ON public.conversations FOR SELECT TO authenticated
USING (
  user_id = (select auth.uid()) OR 
  agent_id IN (SELECT id FROM public.agents WHERE user_id = (select auth.uid()))
);

-- messages (Consolidated + Optimized)
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Agents can view messages" ON public.messages;
CREATE POLICY "participants_view_messages" ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = (select auth.uid()))
  OR
  EXISTS (SELECT 1 FROM public.conversations c JOIN public.agents a ON c.agent_id = a.id WHERE c.id = conversation_id AND a.user_id = (select auth.uid()))
);

DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Agents can insert messages" ON public.messages;
CREATE POLICY "participants_insert_messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (select auth.uid()) 
  AND (
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = (select auth.uid()))
    OR
    EXISTS (SELECT 1 FROM public.conversations c JOIN public.agents a ON c.agent_id = a.id WHERE c.id = conversation_id AND a.user_id = (select auth.uid()))
  )
);

-- destinations (Consolidated)
-- Dropping duplicate/permissive policies
DROP POLICY IF EXISTS "Admins can manage destinations" ON public.destinations;
DROP POLICY IF EXISTS "Anyone can read destinations" ON public.destinations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.destinations;

-- Recreating clean policies
CREATE POLICY "destinations_read_all" ON public.destinations FOR SELECT TO public
USING (true);

CREATE POLICY "destinations_admin_all" ON public.destinations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'admin'));
```

## 3. Remove Unused Indexes (OPTIONAL)
> [!WARNING]
> The linter flags these indexes as "unused", but this may be because your database hasn't had much traffic yet.
> Indexes on Foreign Keys (like `user_id`, `conversation_id`, `booking_id`) are **critical** for RLS performance at scale.
> **I recommend ignoring the `unused_index` warnings for now.**
> If you are absolutely sure you want to drop them, uncomment the lines below.

```sql
-- DROP INDEX IF EXISTS public.idx_agents_tier;
-- DROP INDEX IF EXISTS public.idx_agents_is_available;
-- DROP INDEX IF EXISTS public.idx_agent_matches_status;
-- DROP INDEX IF EXISTS public.idx_itineraries_is_selected;
-- DROP INDEX IF EXISTS public.idx_bookings_state;
-- DROP INDEX IF EXISTS public.idx_bookings_payment_state;
-- DROP INDEX IF EXISTS public.idx_payments_stripe_payment_intent_id;
-- DROP INDEX IF EXISTS public.idx_conversations_state;
-- DROP INDEX IF EXISTS public.idx_messages_created_at;
-- ... (Complete list from linter)
```
