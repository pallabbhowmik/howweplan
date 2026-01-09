-- ============================================================================
-- TripComposer - Database Schema Initialization
-- ============================================================================
-- This script initializes the complete database schema for all services.
-- It runs automatically when PostgreSQL container starts for the first time.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    phone VARCHAR(50),
    phone_verified BOOLEAN DEFAULT FALSE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    photo_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'agent', 'admin')),
    status VARCHAR(30) DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'suspended', 'deactivated')),
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Add missing columns if they don't exist (for existing databases)
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'pending_verification';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

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
-- AGENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    specializations TEXT[] DEFAULT '{}',
    languages TEXT[] DEFAULT '{}',
    destinations TEXT[] DEFAULT '{}',
    years_of_experience INTEGER DEFAULT 0,
    agency_name VARCHAR(255),
    agency_license_number VARCHAR(100),
    tier VARCHAR(20) DEFAULT 'bench' CHECK (tier IN ('star', 'bench')),
    commission_rate DECIMAL(5,4) DEFAULT 0.1000,
    rating DECIMAL(3,2),
    total_reviews INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    response_time_minutes INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_tier ON agents(tier);
CREATE INDEX IF NOT EXISTS idx_agents_is_available ON agents(is_available);

-- ============================================================================
-- TRAVEL REQUESTS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE request_state AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'AGENTS_MATCHED',
        'AGENT_CONFIRMED',
        'ITINERARIES_RECEIVED',
        'ITINERARY_SELECTED',
        'READY_FOR_PAYMENT',
        'PAYMENT_PENDING',
        'BOOKED',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS travel_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    destination JSONB NOT NULL,
    departure_location JSONB,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    travelers JSONB NOT NULL,
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    travel_style VARCHAR(50),
    preferences JSONB DEFAULT '{}',
    notes TEXT,
    state request_state DEFAULT 'DRAFT',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_requests_user_id ON travel_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_requests_state ON travel_requests(state);
CREATE INDEX IF NOT EXISTS idx_travel_requests_expires_at ON travel_requests(expires_at);

-- ============================================================================
-- AGENT MATCHES
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    match_score DECIMAL(5,2),
    tier VARCHAR(20) CHECK (tier IN ('star', 'bench')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    decline_reason TEXT,
    matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(request_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_matches_request_id ON agent_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_agent_matches_agent_id ON agent_matches(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_matches_status ON agent_matches(status);

-- ============================================================================
-- ITINERARIES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE disclosure_state AS ENUM (
        'OBFUSCATED',
        'REVEALED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS itineraries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    highlights TEXT[],
    total_days INTEGER NOT NULL,
    disclosure_state disclosure_state DEFAULT 'OBFUSCATED',
    submission_format VARCHAR(20) CHECK (submission_format IN ('pdf', 'link', 'free_text', 'structured')),
    pdf_url TEXT,
    external_links TEXT[],
    free_text_content TEXT,
    original_content JSONB,
    obfuscated_items JSONB,
    revealed_items JSONB,
    pricing JSONB NOT NULL,
    is_selected BOOLEAN DEFAULT FALSE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itineraries_request_id ON itineraries(request_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_agent_id ON itineraries(agent_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_is_selected ON itineraries(is_selected);

-- ============================================================================
-- BOOKINGS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE booking_state AS ENUM (
        'PENDING_PAYMENT',
        'PAYMENT_AUTHORIZED',
        'CONFIRMED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED_PRE_TRIP',
        'CANCELLED_DURING_TRIP',
        'REFUND_PENDING',
        'REFUNDED_FULL',
        'REFUNDED_PARTIAL',
        'DISPUTED',
        'DISPUTE_RESOLVED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_state AS ENUM (
        'NOT_STARTED',
        'INITIATED',
        'AUTHORIZED',
        'CAPTURED',
        'FAILED',
        'REFUNDED_FULL',
        'REFUNDED_PARTIAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES travel_requests(id) ON DELETE SET NULL,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    state booking_state DEFAULT 'PENDING_PAYMENT',
    payment_state payment_state DEFAULT 'NOT_STARTED',
    base_price_cents BIGINT NOT NULL,
    booking_fee_cents BIGINT NOT NULL,
    platform_commission_cents BIGINT NOT NULL,
    total_amount_cents BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    travel_start_date DATE NOT NULL,
    travel_end_date DATE NOT NULL,
    chat_requirement_met BOOLEAN DEFAULT FALSE,
    contacts_revealed BOOLEAN DEFAULT FALSE,
    contacts_revealed_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_state ON bookings(state);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_state ON bookings(payment_state);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    state payment_state DEFAULT 'NOT_STARTED',
    amount_cents BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE,
    authorized_at TIMESTAMP WITH TIME ZONE,
    captured_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_code VARCHAR(100),
    failure_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- ============================================================================
-- REFUNDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    dispute_id UUID,
    amount_cents BIGINT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    refund_type VARCHAR(20) CHECK (refund_type IN ('full', 'partial')),
    reason TEXT NOT NULL,
    initiated_by VARCHAR(20) CHECK (initiated_by IN ('user', 'agent', 'platform', 'dispute')),
    stripe_refund_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON refunds(booking_id);

-- ============================================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE conversation_state AS ENUM (
        'ACTIVE',
        'PAUSED',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    state conversation_state DEFAULT 'ACTIVE',
    contacts_revealed BOOLEAN DEFAULT FALSE,
    booking_state VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contacts_revealed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_conversations_booking_id ON conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_type VARCHAR(20) CHECK (sender_type IN ('user', 'agent', 'system')),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ============================================================================
-- DISPUTES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE dispute_state AS ENUM (
        'OPENED',
        'AWAITING_AGENT_RESPONSE',
        'AGENT_RESPONDED',
        'USER_REVIEWING',
        'ESCALATED_TO_ADMIN',
        'UNDER_INVESTIGATION',
        'AWAITING_EVIDENCE',
        'RESOLVED_USER_FAVOR',
        'RESOLVED_AGENT_FAVOR',
        'RESOLVED_PARTIAL',
        'DISMISSED_SUBJECTIVE',
        'DISMISSED',
        'WITHDRAWN',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    state dispute_state DEFAULT 'OPENED',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    is_subjective_complaint BOOLEAN DEFAULT FALSE,
    booking_amount BIGINT,
    requested_refund_amount BIGINT,
    approved_refund_amount BIGINT,
    currency VARCHAR(3) DEFAULT 'USD',
    admin_assigned_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_assigned_at TIMESTAMP WITH TIME ZONE,
    agent_response TEXT,
    agent_responded_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    agent_response_deadline TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_state ON disputes(state);
CREATE INDEX IF NOT EXISTS idx_disputes_admin_assigned_id ON disputes(admin_assigned_id);

-- ============================================================================
-- DISPUTE EVIDENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_by_type VARCHAR(20) CHECK (submitted_by_type IN ('user', 'agent', 'admin')),
    evidence_type VARCHAR(20) CHECK (evidence_type IN ('text', 'image', 'document', 'screenshot')),
    title VARCHAR(255),
    description TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

-- ============================================================================
-- REVIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    is_verified BOOLEAN DEFAULT TRUE,
    is_hidden BOOLEAN DEFAULT FALSE,
    hide_reason TEXT,
    response TEXT,
    response_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_agent_id ON reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);

-- ============================================================================
-- AUDIT EVENTS (Append-Only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    event_version VARCHAR(20) DEFAULT '1.0.0',
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    source_service VARCHAR(100) NOT NULL,
    correlation_id VARCHAR(255),
    causation_id VARCHAR(255),
    actor_type VARCHAR(20) CHECK (actor_type IN ('user', 'agent', 'admin', 'system')),
    actor_id VARCHAR(255),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    reason TEXT,
    previous_state JSONB,
    new_state JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Append-only: No UPDATE or DELETE triggers
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_occurred_at ON audit_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource_type_id ON audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_correlation_id ON audit_events(correlation_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============================================================================
-- DESTINATIONS (for Explore page - admin editable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS destinations (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL CHECK (region IN ('North', 'South', 'East', 'West', 'Central', 'Northeast')),
    themes TEXT[] NOT NULL DEFAULT '{}',
    ideal_months INTEGER[] NOT NULL DEFAULT '{}',
    suggested_duration_min INTEGER NOT NULL DEFAULT 2,
    suggested_duration_max INTEGER NOT NULL DEFAULT 4,
    highlight TEXT NOT NULL,
    image_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destinations_region ON destinations(region);
CREATE INDEX IF NOT EXISTS idx_destinations_is_active ON destinations(is_active);
CREATE INDEX IF NOT EXISTS idx_destinations_is_featured ON destinations(is_featured);

-- ============================================================================
-- ADD MISSING COLUMNS (for schema upgrades on existing databases)
-- ============================================================================

-- Travel requests state column
DO $$ BEGIN
    ALTER TABLE travel_requests ADD COLUMN state request_state DEFAULT 'DRAFT';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Itineraries disclosure_state column
DO $$ BEGIN
    ALTER TABLE itineraries ADD COLUMN disclosure_state disclosure_state DEFAULT 'OBFUSCATED';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Bookings state columns
DO $$ BEGIN
    ALTER TABLE bookings ADD COLUMN state booking_state DEFAULT 'PENDING_PAYMENT';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE bookings ADD COLUMN payment_state payment_state DEFAULT 'NOT_STARTED';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Payments state column
DO $$ BEGIN
    ALTER TABLE payments ADD COLUMN state payment_state DEFAULT 'NOT_STARTED';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Conversations state column
DO $$ BEGIN
    ALTER TABLE conversations ADD COLUMN state conversation_state DEFAULT 'ACTIVE';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Disputes - all columns that might be missing
DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN state dispute_state DEFAULT 'OPENED';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN admin_assigned_id UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN admin_assigned_at TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN agent_response TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN agent_responded_at TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN resolution_notes TEXT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN agent_response_deadline TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN is_subjective_complaint BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN booking_amount BIGINT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN requested_refund_amount BIGINT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE disputes ADD COLUMN approved_refund_amount BIGINT;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Create missing indexes for disputes
CREATE INDEX IF NOT EXISTS idx_disputes_admin_assigned_id ON disputes(admin_assigned_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers (drop first to make idempotent)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_travel_requests_updated_at ON travel_requests;
CREATE TRIGGER update_travel_requests_updated_at BEFORE UPDATE ON travel_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_itineraries_updated_at ON itineraries;
CREATE TRIGGER update_itineraries_updated_at BEFORE UPDATE ON itineraries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_destinations_updated_at ON destinations;
CREATE TRIGGER update_destinations_updated_at BEFORE UPDATE ON destinations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prevent modification of audit events (append-only)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are immutable and cannot be modified or deleted';
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS prevent_audit_update ON audit_events;
CREATE TRIGGER prevent_audit_update BEFORE UPDATE ON audit_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS prevent_audit_delete ON audit_events;
CREATE TRIGGER prevent_audit_delete BEFORE DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ============================================================================
-- TRUST & REPUTATION SYSTEM
-- ============================================================================

-- Agent Stats: Stores computed trust statistics for each agent
CREATE TABLE IF NOT EXISTS agent_stats (
    agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Activity metrics
    total_proposals_submitted INTEGER NOT NULL DEFAULT 0,
    total_bookings_completed INTEGER NOT NULL DEFAULT 0,
    total_bookings_cancelled INTEGER NOT NULL DEFAULT 0,
    
    -- Rating metrics (computed from trust_reviews)
    average_rating DECIMAL(3,2) CHECK (average_rating IS NULL OR (average_rating >= 1 AND average_rating <= 5)),
    rating_count INTEGER NOT NULL DEFAULT 0,
    
    -- Response time metrics (in minutes)
    response_time_p50 INTEGER,
    response_time_p90 INTEGER,
    
    -- Trust & compliance
    platform_violation_count INTEGER NOT NULL DEFAULT 0,
    trust_level VARCHAR(20) NOT NULL DEFAULT 'LEVEL_1' 
        CHECK (trust_level IN ('LEVEL_1', 'LEVEL_2', 'LEVEL_3')),
    badges TEXT[] NOT NULL DEFAULT '{}',
    
    -- Verification status (synced from identity service)
    identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
    bank_verified BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Platform protection
    platform_protection_score INTEGER NOT NULL DEFAULT 100 CHECK (platform_protection_score >= 0 AND platform_protection_score <= 100),
    platform_protection_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Agent status (for admin actions)
    is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    frozen_at TIMESTAMP WITH TIME ZONE,
    frozen_by UUID REFERENCES users(id),
    frozen_reason TEXT,
    
    -- Timestamps
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_recalculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_stats_trust_level ON agent_stats(trust_level);
CREATE INDEX IF NOT EXISTS idx_agent_stats_rating ON agent_stats(average_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_agent_stats_protection ON agent_stats(platform_protection_eligible);
CREATE INDEX IF NOT EXISTS idx_agent_stats_frozen ON agent_stats(is_frozen) WHERE is_frozen = TRUE;

-- Trust Reviews: Immutable review records from completed bookings
CREATE TABLE IF NOT EXISTS trust_reviews (
    review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Rating dimensions (1-5 scale)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    planning_quality INTEGER NOT NULL CHECK (planning_quality >= 1 AND planning_quality <= 5),
    responsiveness INTEGER NOT NULL CHECK (responsiveness >= 1 AND responsiveness <= 5),
    accuracy_vs_promise INTEGER NOT NULL CHECK (accuracy_vs_promise >= 1 AND accuracy_vs_promise <= 5),
    
    -- Optional text feedback
    comment TEXT CHECK (comment IS NULL OR LENGTH(comment) <= 2000),
    
    -- Immutability flag (always true, enforced by trigger)
    is_immutable BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Timestamps (immutable after creation)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Visibility control (admin only can modify)
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_at TIMESTAMP WITH TIME ZONE,
    hidden_by UUID REFERENCES users(id),
    hidden_reason TEXT,
    
    -- Ensure one review per booking per user
    CONSTRAINT uq_trust_reviews_booking_user UNIQUE (booking_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trust_reviews_agent ON trust_reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_trust_reviews_user ON trust_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_reviews_booking ON trust_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_trust_reviews_created ON trust_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_reviews_visible ON trust_reviews(agent_id, is_hidden) WHERE is_hidden = FALSE;

-- Badge History: Tracks all badge assignments and revocations
CREATE TABLE IF NOT EXISTS badge_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge VARCHAR(50) NOT NULL 
        CHECK (badge IN ('VERIFIED_AGENT', 'PLATFORM_TRUSTED', 'TOP_PLANNER', 'ON_TIME_EXPERT', 'NEWLY_VERIFIED')),
    action VARCHAR(20) NOT NULL CHECK (action IN ('ASSIGNED', 'REVOKED')),
    reason TEXT NOT NULL,
    triggered_by VARCHAR(20) NOT NULL CHECK (triggered_by IN ('SYSTEM', 'ADMIN')),
    admin_id UUID REFERENCES users(id),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badge_history_agent ON badge_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_badge_history_badge ON badge_history(badge);
CREATE INDEX IF NOT EXISTS idx_badge_history_created ON badge_history(created_at DESC);

-- Violations: Records platform violations that affect trust scores
CREATE TABLE IF NOT EXISTS violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL 
        CHECK (violation_type IN (
            'CONTACT_INFO_LEAK', 
            'EXTERNAL_PAYMENT_LINK', 
            'PAYMENT_INFO_LEAK', 
            'EXTERNAL_LINK_SHARE',
            'FRAUD_DETECTED',
            'EXCESSIVE_CANCELLATIONS',
            'DISPUTE_LOST',
            'POLICY_VIOLATION'
        )),
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Context
    booking_id UUID REFERENCES bookings(id),
    message_id UUID,
    evidence JSONB NOT NULL DEFAULT '{}',
    
    -- Detection info
    auto_detected BOOLEAN NOT NULL DEFAULT TRUE,
    reported_by UUID REFERENCES users(id),
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_agent ON violations(agent_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_unresolved ON violations(agent_id, resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_violations_created ON violations(created_at DESC);

-- Review Eligibility Cache: For performance
CREATE TABLE IF NOT EXISTS review_eligibility (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    review_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    review_id UUID REFERENCES trust_reviews(review_id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_eligibility_user ON review_eligibility(user_id);
CREATE INDEX IF NOT EXISTS idx_review_eligibility_eligible ON review_eligibility(user_id, is_eligible) WHERE is_eligible = TRUE AND review_submitted = FALSE;

-- Trigger to prevent updates to immutable review fields
CREATE OR REPLACE FUNCTION prevent_review_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.review_id != NEW.review_id OR
       OLD.booking_id != NEW.booking_id OR
       OLD.agent_id != NEW.agent_id OR
       OLD.user_id != NEW.user_id OR
       OLD.rating != NEW.rating OR
       OLD.planning_quality != NEW.planning_quality OR
       OLD.responsiveness != NEW.responsiveness OR
       OLD.accuracy_vs_promise != NEW.accuracy_vs_promise OR
       OLD.comment IS DISTINCT FROM NEW.comment OR
       OLD.created_at != NEW.created_at THEN
        RAISE EXCEPTION 'Trust reviews are immutable. Only visibility can be changed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_review_update ON trust_reviews;
CREATE TRIGGER trigger_prevent_review_update
    BEFORE UPDATE ON trust_reviews
    FOR EACH ROW
    EXECUTE FUNCTION prevent_review_update();

-- Function to increment violation count atomically
CREATE OR REPLACE FUNCTION increment_agent_violation_count(p_agent_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE agent_stats 
    SET platform_violation_count = platform_violation_count + 1,
        last_updated_at = NOW()
    WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate agent stats from reviews
CREATE OR REPLACE FUNCTION recalculate_agent_review_stats(p_agent_id UUID)
RETURNS void AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
    v_rating_count INTEGER;
BEGIN
    SELECT 
        ROUND(AVG(rating)::numeric, 2),
        COUNT(*)
    INTO v_avg_rating, v_rating_count
    FROM trust_reviews
    WHERE agent_id = p_agent_id AND is_hidden = FALSE;
    
    UPDATE agent_stats
    SET average_rating = v_avg_rating,
        rating_count = v_rating_count,
        last_recalculated_at = NOW(),
        last_updated_at = NOW()
    WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-recalculate stats when review is added/hidden
CREATE OR REPLACE FUNCTION trigger_recalculate_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM recalculate_agent_review_stats(NEW.agent_id);
    ELSIF TG_OP = 'UPDATE' AND OLD.is_hidden != NEW.is_hidden THEN
        PERFORM recalculate_agent_review_stats(NEW.agent_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_review_stats_update ON trust_reviews;
CREATE TRIGGER trigger_review_stats_update
    AFTER INSERT OR UPDATE ON trust_reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_agent_stats();

-- ============================================================================
-- AGENT RESPONSE TIME TRACKING
-- ============================================================================

-- Table: agent_response_events
-- Stores individual request-to-response timing events
CREATE TABLE IF NOT EXISTS agent_response_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES travel_requests(id) ON DELETE CASCADE,
    request_received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    first_response_at TIMESTAMP WITH TIME ZONE,
    response_time_minutes INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN first_response_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (first_response_at - request_received_at)) / 60
            ELSE NULL 
        END
    ) STORED,
    response_type VARCHAR(50) CHECK (response_type IN (
        'PROPOSAL_SUBMITTED', 'MESSAGE_SENT', 'DECLINED', 'EXPIRED'
    )),
    was_within_business_hours BOOLEAN DEFAULT FALSE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (agent_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_response_events_agent ON agent_response_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_response_events_received_at ON agent_response_events(request_received_at);

-- Table: agent_response_metrics
-- Cached/materialized response time metrics per agent
CREATE TABLE IF NOT EXISTS agent_response_metrics (
    agent_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_requests_received INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    total_proposals INTEGER DEFAULT 0,
    total_declined INTEGER DEFAULT 0,
    total_expired INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2) DEFAULT 0,
    response_time_p50 INTEGER,
    response_time_p75 INTEGER,
    response_time_p90 INTEGER,
    response_time_avg DECIMAL(10,2),
    response_time_min INTEGER,
    response_time_max INTEGER,
    response_time_label VARCHAR(30) DEFAULT 'NEW' CHECK (response_time_label IN (
        'NEW', 'WITHIN_30_MIN', 'WITHIN_1_HOUR', 'WITHIN_2_HOURS',
        'WITHIN_4_HOURS', 'WITHIN_8_HOURS', 'WITHIN_24_HOURS', 'MORE_THAN_24_HOURS'
    )),
    business_hours_p50 INTEGER,
    after_hours_p50 INTEGER,
    trend VARCHAR(20) DEFAULT 'STABLE' CHECK (trend IN ('IMPROVING', 'STABLE', 'DECLINING')),
    trend_change_minutes INTEGER DEFAULT 0,
    sample_size INTEGER DEFAULT 0,
    last_response_at TIMESTAMP WITH TIME ZONE,
    last_recalculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helper function to get display label from P50 minutes
CREATE OR REPLACE FUNCTION get_response_time_label(p50_minutes INTEGER)
RETURNS VARCHAR(30) AS $$
BEGIN
    IF p50_minutes IS NULL THEN RETURN 'NEW'; END IF;
    IF p50_minutes <= 30 THEN RETURN 'WITHIN_30_MIN'; END IF;
    IF p50_minutes <= 60 THEN RETURN 'WITHIN_1_HOUR'; END IF;
    IF p50_minutes <= 120 THEN RETURN 'WITHIN_2_HOURS'; END IF;
    IF p50_minutes <= 240 THEN RETURN 'WITHIN_4_HOURS'; END IF;
    IF p50_minutes <= 480 THEN RETURN 'WITHIN_8_HOURS'; END IF;
    IF p50_minutes <= 1440 THEN RETURN 'WITHIN_24_HOURS'; END IF;
    RETURN 'MORE_THAN_24_HOURS';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- In production, create separate roles with limited permissions
-- For local dev with Docker, grant to tripcomposer
-- For Supabase, permissions are managed automatically

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tripcomposer') THEN
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tripcomposer;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tripcomposer;
    END IF;
END $$;

