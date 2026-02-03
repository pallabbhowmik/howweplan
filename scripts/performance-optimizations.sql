-- ============================================================================
-- Performance Optimizations - Database Indexes & Query Optimization
-- ============================================================================
-- Run this migration to add optimized indexes for common query patterns.
-- These indexes use B-tree (default), partial indexes, and composite indexes
-- for optimal query performance.
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
CREATE INDEX IF NOT EXISTS idx_travel_requests_state_created 
    ON travel_requests(state, created_at DESC)
    WHERE state IN ('SUBMITTED', 'MATCHING');

-- Index for expired request cleanup
CREATE INDEX IF NOT EXISTS idx_travel_requests_expiry 
    ON travel_requests(expires_at)
    WHERE state NOT IN ('COMPLETED', 'CANCELLED', 'EXPIRED');

-- ============================================================================
-- CONVERSATIONS - Composite Indexes for Messaging
-- ============================================================================
-- Messaging queries need fast lookup by participant + state

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

-- ============================================================================
-- MESSAGES - Indexes for Chat Performance
-- ============================================================================
-- Chat requires fast retrieval of messages by conversation + timestamp

-- Messages in conversation (chat history)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time 
    ON messages(conversation_id, created_at DESC);

-- Unread messages count (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_messages_unread 
    ON messages(conversation_id, sender_type)
    WHERE is_read = false;

-- ============================================================================
-- NOTIFICATIONS - Indexes for Real-time Updates
-- ============================================================================
-- Users need fast access to unread notifications

-- User's unread notifications (partial index)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON notifications(user_id, created_at DESC)
    WHERE is_read = false;

-- Cleanup of old read notifications
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup 
    ON notifications(created_at)
    WHERE is_read = true;

-- ============================================================================
-- BOOKINGS - Composite Indexes for Dashboard
-- ============================================================================

-- User's bookings by status (traveler dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_user_status 
    ON bookings(user_id, status, created_at DESC);

-- Agent's bookings by status (agent dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_agent_status 
    ON bookings(agent_id, status, created_at DESC);

-- Payment tracking
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status 
    ON bookings(payment_status, created_at DESC)
    WHERE payment_status != 'PAID';

-- ============================================================================
-- ITINERARIES - Indexes for Proposal Queries
-- ============================================================================

-- Itineraries by request (for proposal comparison)
CREATE INDEX IF NOT EXISTS idx_itineraries_request_status 
    ON itineraries(request_id, status, created_at DESC);

-- Agent's proposals
CREATE INDEX IF NOT EXISTS idx_itineraries_agent_status 
    ON itineraries(agent_id, status, created_at DESC);

-- ============================================================================
-- ITINERARY ITEMS - Indexes for Day-by-Day Queries
-- ============================================================================

-- Items in itinerary (already indexed by itinerary_id)
-- Add composite for day-based queries
CREATE INDEX IF NOT EXISTS idx_itinerary_items_day 
    ON itinerary_items(itinerary_id, day_number, sequence);

-- ============================================================================
-- AGENTS - Indexes for Matching & Discovery
-- ============================================================================

-- Active agents for matching (partial index)
CREATE INDEX IF NOT EXISTS idx_agents_available 
    ON agents(is_available, tier, rating DESC)
    WHERE is_available = true;

-- GIN index for array columns (specializations, destinations)
-- Enables efficient @> (contains) queries
CREATE INDEX IF NOT EXISTS idx_agents_specializations_gin 
    ON agents USING GIN(specializations);

CREATE INDEX IF NOT EXISTS idx_agents_destinations_gin 
    ON agents USING GIN(destinations);

CREATE INDEX IF NOT EXISTS idx_agents_languages_gin 
    ON agents USING GIN(languages);

-- ============================================================================
-- AGENT STATS - Trust & Reputation Queries
-- ============================================================================

-- Top-rated agents (for featured listings)
CREATE INDEX IF NOT EXISTS idx_agent_stats_featured 
    ON agent_stats(average_rating DESC NULLS LAST, rating_count DESC)
    WHERE is_frozen = false AND platform_protection_eligible = true;

-- Response time leaderboard
CREATE INDEX IF NOT EXISTS idx_agent_stats_response_time 
    ON agent_stats(response_time_p50)
    WHERE response_time_p50 IS NOT NULL;

-- ============================================================================
-- TRUST REVIEWS - Indexes for Review Display
-- ============================================================================

-- Agent's reviews (paginated, recent first)
CREATE INDEX IF NOT EXISTS idx_trust_reviews_agent_created 
    ON trust_reviews(agent_id, created_at DESC)
    WHERE is_hidden = false;

-- High-rated reviews for testimonials
CREATE INDEX IF NOT EXISTS idx_trust_reviews_high_rated 
    ON trust_reviews(rating DESC, created_at DESC)
    WHERE is_hidden = false AND rating >= 4;

-- ============================================================================
-- USERS - Indexes for Identity Lookups
-- ============================================================================

-- Email lookup (usually unique index exists, but ensure it)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique 
    ON users(LOWER(email));

-- User type queries
CREATE INDEX IF NOT EXISTS idx_users_type 
    ON users(user_type)
    WHERE user_type IN ('AGENT', 'ADMIN');

-- ============================================================================
-- PAYMENTS - Indexes for Financial Queries
-- ============================================================================

-- Pending payments (for follow-up)
CREATE INDEX IF NOT EXISTS idx_payments_status_created 
    ON payments(status, created_at DESC)
    WHERE status IN ('PENDING', 'PROCESSING');

-- User's payment history
CREATE INDEX IF NOT EXISTS idx_payments_user 
    ON payments(user_id, created_at DESC);

-- ============================================================================
-- ANALYZE & STATISTICS
-- ============================================================================
-- Run ANALYZE to update statistics after creating indexes

ANALYZE travel_requests;
ANALYZE conversations;
ANALYZE messages;
ANALYZE notifications;
ANALYZE bookings;
ANALYZE itineraries;
ANALYZE itinerary_items;
ANALYZE agents;
ANALYZE agent_stats;
ANALYZE trust_reviews;
ANALYZE users;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_travel_requests_user_state IS 
    'Composite B-tree index for user dashboard - fetches requests by state efficiently';

COMMENT ON INDEX idx_conversations_user_state IS 
    'Composite index for messaging inbox - user conversations sorted by recency';

COMMENT ON INDEX idx_messages_unread IS 
    'Partial index for unread message counts - only indexes unread messages';

COMMENT ON INDEX idx_agents_specializations_gin IS 
    'GIN index for array containment queries on agent specializations';
