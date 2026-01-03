-- ============================================================================
-- Fix travel_requests table schema for Supabase
-- Run this in Supabase SQL Editor to add missing columns
-- ============================================================================

-- Add missing columns for travelers breakdown
ALTER TABLE travel_requests 
ADD COLUMN IF NOT EXISTS adults INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS children INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS infants INTEGER NOT NULL DEFAULT 0;

-- Add missing columns for travel details
ALTER TABLE travel_requests 
ADD COLUMN IF NOT EXISTS departure_location VARCHAR(200),
ADD COLUMN IF NOT EXISTS travel_style VARCHAR(20) DEFAULT 'mid-range';

-- Add budget currency column
ALTER TABLE travel_requests 
ADD COLUMN IF NOT EXISTS budget_currency VARCHAR(3) DEFAULT 'INR';

-- Add notes column
ALTER TABLE travel_requests 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing timestamp columns
ALTER TABLE travel_requests 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS state_changed_at TIMESTAMPTZ DEFAULT NOW();

-- Add cancellation columns if not exist
ALTER TABLE travel_requests 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(10);

-- Rename existing columns to match code expectations (if needed)
-- The code expects 'state' but the existing schema has 'status'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_requests' AND column_name = 'status'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_requests' AND column_name = 'state'
  ) THEN
    ALTER TABLE travel_requests RENAME COLUMN status TO state;
  END IF;
END $$;

-- Rename start_date/end_date to departure_date/return_date if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_requests' AND column_name = 'start_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_requests' AND column_name = 'departure_date'
  ) THEN
    ALTER TABLE travel_requests RENAME COLUMN start_date TO departure_date;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_requests' AND column_name = 'end_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'travel_requests' AND column_name = 'return_date'
  ) THEN
    ALTER TABLE travel_requests RENAME COLUMN end_date TO return_date;
  END IF;
END $$;

-- Convert existing travelers_count to adults if data exists
UPDATE travel_requests 
SET adults = COALESCE(travelers_count, 1)
WHERE adults = 1 AND travelers_count IS NOT NULL AND travelers_count > 1;

-- Add check constraints (optional - may fail if data violates them)
-- ALTER TABLE travel_requests ADD CONSTRAINT IF NOT EXISTS check_adults CHECK (adults >= 1 AND adults <= 10);
-- ALTER TABLE travel_requests ADD CONSTRAINT IF NOT EXISTS check_children CHECK (children >= 0 AND children <= 10);
-- ALTER TABLE travel_requests ADD CONSTRAINT IF NOT EXISTS check_infants CHECK (infants >= 0 AND infants <= 5);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_travel_requests_user_id ON travel_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_requests_state ON travel_requests(state);

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'travel_requests'
ORDER BY ordinal_position;
