-- TripComposer Supabase Database Initialization
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'agent', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed');
CREATE TYPE request_status AS ENUM ('open', 'matched', 'proposals_received', 'accepted', 'completed', 'cancelled');
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'escalated', 'closed');
CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'refunded', 'failed');

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ADMINS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]',
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USER SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    proposal_alerts BOOLEAN DEFAULT true,
    message_alerts BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    weekly_digest BOOLEAN DEFAULT true,
    -- Privacy settings
    profile_visible BOOLEAN DEFAULT true,
    show_travel_history BOOLEAN DEFAULT false,
    allow_agent_contact BOOLEAN DEFAULT true,
    -- User preferences
    currency VARCHAR(3) DEFAULT 'INR',
    language VARCHAR(5) DEFAULT 'en',
    theme VARCHAR(10) DEFAULT 'light',
    sound_enabled BOOLEAN DEFAULT true,
    -- Security settings
    two_factor_enabled BOOLEAN DEFAULT false,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- =============================================
-- AGENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agency_name VARCHAR(255),
    license_number VARCHAR(100),
    specializations TEXT[],
    bio TEXT,
    rating DECIMAL(2,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TRAVEL REQUESTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS travel_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    destination VARCHAR(255) NOT NULL,
    departure_location VARCHAR(255),
    departure_date TIMESTAMPTZ,
    return_date TIMESTAMPTZ,
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    budget_currency VARCHAR(3) DEFAULT 'INR',
    -- Travelers breakdown
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER NOT NULL DEFAULT 0,
    infants INTEGER NOT NULL DEFAULT 0,
    travelers_count INTEGER DEFAULT 1, -- Keep for backward compatibility
    travel_style VARCHAR(20) DEFAULT 'mid-range',
    preferences JSONB DEFAULT '{}',
    notes TEXT,
    state VARCHAR(20) DEFAULT 'submitted',
    -- Timestamps
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    state_changed_at TIMESTAMPTZ DEFAULT NOW(),
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_requests_user_id ON travel_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_requests_state ON travel_requests(state);

-- =============================================
-- ITINERARY OPTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS itinerary_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_price DECIMAL(10,2) NOT NULL,
    itinerary_details JSONB NOT NULL,
    includes TEXT[],
    excludes TEXT[],
    terms_conditions TEXT,
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- BOOKINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    itinerary_id UUID REFERENCES itinerary_options(id) ON DELETE SET NULL,
    request_id UUID REFERENCES travel_requests(id) ON DELETE SET NULL,
    status booking_status DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    travelers JSONB DEFAULT '[]',
    booking_details JSONB DEFAULT '{}',
    confirmation_code VARCHAR(50),
    notes TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status payment_status DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- DISPUTES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    assigned_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status dispute_status DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- REVIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    response TEXT,
    response_at TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- AUDIT LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- APP SETTINGS TABLE (For Admin Configuration)
-- =============================================
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, key)
);

-- =============================================
-- CREATE INDEXES
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_travel_requests_user_id ON travel_requests(user_id);
CREATE INDEX idx_travel_requests_status ON travel_requests(status);
CREATE INDEX idx_itinerary_options_request_id ON itinerary_options(request_id);
CREATE INDEX idx_itinerary_options_agent_id ON itinerary_options(agent_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_agent_id ON bookings(agent_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_reviews_agent_id ON reviews(agent_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_app_settings_category ON app_settings(category);

-- =============================================
-- UPDATE TIMESTAMP TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_travel_requests_updated_at BEFORE UPDATE ON travel_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_itinerary_options_updated_at BEFORE UPDATE ON itinerary_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- BOOKING NUMBER GENERATOR
-- =============================================
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
    dest_code VARCHAR(3);
    year_part VARCHAR(4);
    serial_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    dest_code := UPPER(SUBSTRING(COALESCE(NEW.booking_details->>'destination', 'TRP'), 1, 3));
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO serial_num
    FROM bookings
    WHERE booking_number LIKE 'TC-' || year_part || '-%';
    
    NEW.booking_number := 'TC-' || year_part || '-' || dest_code || '-' || LPAD(serial_num::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_booking_number_trigger
BEFORE INSERT ON bookings
FOR EACH ROW
WHEN (NEW.booking_number IS NULL)
EXECUTE FUNCTION generate_booking_number();
