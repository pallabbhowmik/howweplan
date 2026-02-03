-- ============================================================================
-- Performance Optimizations - Database Indexes & Query Optimization
-- ============================================================================
-- Run this migration to add optimized indexes for common query patterns.
-- These indexes use B-tree (default), partial indexes, and composite indexes
-- for optimal query performance.
-- 
-- NOTE: This script uses IF NOT EXISTS and checks for column/table existence
-- to be safely re-runnable.
-- ============================================================================

-- ============================================================================
-- TRAVEL REQUESTS - Composite Indexes for Dashboard Queries
-- ============================================================================
-- Users frequently query their requests filtered by state (active/completed)
-- B-tree composite index for efficient range scans

-- Index for user's requests by state (most common dashboard query)
CREATE INDEX IF NOT EXISTS idx_travel_requests_user_state 
    ON travel_requests(user_id, state);

-- Index for date-range queries (finding upcoming trips)
CREATE INDEX IF NOT EXISTS idx_travel_requests_dates 
    ON travel_requests(departure_date, return_date);

-- Index for matching service queries (requests waiting for agents)
-- Note: Using lowercase state values as per schema
CREATE INDEX IF NOT EXISTS idx_travel_requests_state_created 
    ON travel_requests(state, created_at DESC);

-- ============================================================================
-- CONVERSATIONS - Composite Indexes for Messaging
-- ============================================================================
-- Messaging queries need fast lookup by participant + state
-- Note: Only create if conversations table exists

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        -- User's active conversations (inbox view)
        CREATE INDEX IF NOT EXISTS idx_conversations_user_state 
            ON conversations(user_id, state, updated_at DESC);

        -- Agent's active conversations
        CREATE INDEX IF NOT EXISTS idx_conversations_agent_state 
            ON conversations(agent_id, state, updated_at DESC);

        -- Booking-related conversation lookup
        CREATE INDEX IF NOT EXISTS idx_conversations_booking 
            ON conversations(booking_id)
            WHERE booking_id IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- MESSAGES - Indexes for Chat Performance
-- ============================================================================
-- Chat requires fast retrieval of messages by conversation + timestamp

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        -- Messages in conversation (chat history)
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_time 
            ON messages(conversation_id, created_at DESC);
    END IF;
END $$;

-- ============================================================================
-- NOTIFICATIONS - Indexes for Real-time Updates
-- ============================================================================
-- Users need fast access to unread notifications

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- User's unread notifications (partial index)
        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
            ON notifications(user_id, created_at DESC)
            WHERE is_read = false;
    END IF;
END $$;

-- ============================================================================
-- BOOKINGS - Composite Indexes for Dashboard
-- ============================================================================
-- Note: bookings table uses 'state' column of type booking_state enum

-- User's bookings by state (traveler dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_user_state 
    ON bookings(user_id, state, created_at DESC);

-- Agent's bookings by state (agent dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_agent_state 
    ON bookings(agent_id, state, created_at DESC);

-- ============================================================================
-- ITINERARIES - Indexes for Proposal Queries
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'itineraries') THEN
        -- Itineraries by request (for proposal comparison)
        CREATE INDEX IF NOT EXISTS idx_itineraries_request_status 
            ON itineraries(request_id, status, created_at DESC);

        -- Agent's proposals
        CREATE INDEX IF NOT EXISTS idx_itineraries_agent_status 
            ON itineraries(agent_id, status, created_at DESC);
    END IF;
END $$;

-- ============================================================================
-- ITINERARY ITEMS - Indexes for Day-by-Day Queries
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'itinerary_items') THEN
        -- Items in itinerary - composite for day-based queries
        CREATE INDEX IF NOT EXISTS idx_itinerary_items_day 
            ON itinerary_items(itinerary_id, day_number, sequence);
    END IF;
END $$;

-- ============================================================================
-- AGENTS - Indexes for Matching & Discovery
-- ============================================================================

-- Active agents for matching (partial index)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'agents' AND column_name = 'is_available') THEN
        CREATE INDEX IF NOT EXISTS idx_agents_available 
            ON agents(is_available, rating DESC)
            WHERE is_available = true;
    END IF;
END $$;

-- GIN index for array columns (specializations)
-- Enables efficient @> (contains) queries
CREATE INDEX IF NOT EXISTS idx_agents_specializations_gin 
    ON agents USING GIN(specializations);

-- ============================================================================
-- AGENT STATS - Trust & Reputation Queries
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_stats') THEN
        -- Top-rated agents (for featured listings)
        CREATE INDEX IF NOT EXISTS idx_agent_stats_featured 
            ON agent_stats(average_rating DESC NULLS LAST, rating_count DESC)
            WHERE is_frozen = false AND platform_protection_eligible = true;

        -- Response time leaderboard
        CREATE INDEX IF NOT EXISTS idx_agent_stats_response_time 
            ON agent_stats(response_time_p50)
            WHERE response_time_p50 IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- TRUST REVIEWS - Indexes for Review Display
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trust_reviews') THEN
        -- Agent's reviews (paginated, recent first)
        CREATE INDEX IF NOT EXISTS idx_trust_reviews_agent_created 
            ON trust_reviews(agent_id, created_at DESC)
            WHERE is_hidden = false;

        -- High-rated reviews for testimonials
        CREATE INDEX IF NOT EXISTS idx_trust_reviews_high_rated 
            ON trust_reviews(rating DESC, created_at DESC)
            WHERE is_hidden = false AND rating >= 4;
    END IF;
END $$;

-- ============================================================================
-- USERS - Indexes for Identity Lookups
-- ============================================================================

-- Email lookup with case-insensitive matching
DO $$ 
BEGIN
    -- Only create if index doesn't exist (avoid unique constraint conflicts)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email_lower') THEN
        CREATE INDEX idx_users_email_lower ON users(LOWER(email));
    END IF;
END $$;

-- ============================================================================
-- PAYMENTS - Indexes for Financial Queries
-- ============================================================================

-- Pending payments (for follow-up)
CREATE INDEX IF NOT EXISTS idx_payments_state_created 
    ON payments(state, created_at DESC);

-- User's payment history
CREATE INDEX IF NOT EXISTS idx_payments_user 
    ON payments(user_id, created_at DESC);

-- ============================================================================
-- ANALYZE & STATISTICS
-- ============================================================================
-- Run ANALYZE to update statistics after creating indexes

ANALYZE travel_requests;
ANALYZE bookings;
ANALYZE payments;
ANALYZE agents;
ANALYZE users;

-- Conditionally analyze tables that may not exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        ANALYZE conversations;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        ANALYZE messages;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ANALYZE notifications;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'itineraries') THEN
        ANALYZE itineraries;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'itinerary_items') THEN
        ANALYZE itinerary_items;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_stats') THEN
        ANALYZE agent_stats;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trust_reviews') THEN
        ANALYZE trust_reviews;
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_travel_requests_user_state IS 
    'Composite B-tree index for user dashboard - fetches requests by state efficiently';

COMMENT ON INDEX idx_bookings_user_state IS 
    'Composite index for user bookings - sorted by state and creation date';

COMMENT ON INDEX idx_agents_specializations_gin IS 
    'GIN index for array containment queries on agent specializations';
