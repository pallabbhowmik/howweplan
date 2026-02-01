-- Fix itineraries schema to match service code expectations
-- Run this against the Supabase database

-- Add missing columns to itineraries table
ALTER TABLE itineraries 
ADD COLUMN IF NOT EXISTS traveler_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ARCHIVED')),
ADD COLUMN IF NOT EXISTS overview JSONB,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS disclosed_at TIMESTAMP WITH TIME ZONE;

-- Create itinerary_items table if not exists
CREATE TABLE IF NOT EXISTS itinerary_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ACCOMMODATION', 'TRANSPORT', 'ACTIVITY', 'MEAL', 'FREE_TIME', 'TRANSFER', 'OTHER')),
    day_number INTEGER NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 0,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location JSONB,
    time_range JSONB,
    vendor JSONB,
    accommodation_details JSONB,
    transport_details JSONB,
    activity_details JSONB,
    agent_notes TEXT,
    traveler_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary_id ON itinerary_items(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_day_number ON itinerary_items(day_number);

-- Update disclosure_state enum if needed
DO $$
BEGIN
    -- Check if OBFUSCATED value exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OBFUSCATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'disclosure_state')) THEN
        ALTER TYPE disclosure_state ADD VALUE IF NOT EXISTS 'OBFUSCATED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REVEALED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'disclosure_state')) THEN
        ALTER TYPE disclosure_state ADD VALUE IF NOT EXISTS 'REVEALED';
    END IF;
END $$;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_itinerary_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_itinerary_items_updated_at ON itinerary_items;
CREATE TRIGGER update_itinerary_items_updated_at
    BEFORE UPDATE ON itinerary_items
    FOR EACH ROW
    EXECUTE FUNCTION update_itinerary_items_updated_at();
