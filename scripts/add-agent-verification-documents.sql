-- Agent Verification Documents System for Indian Travel Agents
-- This script creates the necessary tables for comprehensive document verification

-- ============================================================================
-- VERIFICATION DOCUMENTS TABLE
-- ============================================================================

-- Drop existing simple verification_documents table if it exists
DROP TABLE IF EXISTS verification_documents CASCADE;
DROP TABLE IF EXISTS verification_comments CASCADE;

-- Create comprehensive verification documents table
CREATE TABLE verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Document Info
    document_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    document_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- Extracted Data (from OCR or manual entry)
    extracted_data JSONB DEFAULT '{}',
    
    -- Verification Status
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    
    -- Admin Feedback
    admin_comments TEXT,
    rejection_reason TEXT,
    reupload_requested_at TIMESTAMP WITH TIME ZONE,
    reupload_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('NOT_UPLOADED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'REUPLOAD_REQUESTED')),
    CONSTRAINT valid_category CHECK (category IN ('IDENTITY', 'BUSINESS', 'PROFESSIONAL', 'FINANCIAL', 'ADDRESS', 'ADDITIONAL'))
);

-- Create index for faster lookups
CREATE INDEX idx_verification_documents_user_id ON verification_documents(user_id);
CREATE INDEX idx_verification_documents_status ON verification_documents(status);
CREATE INDEX idx_verification_documents_type ON verification_documents(document_type);
CREATE UNIQUE INDEX idx_verification_documents_user_type ON verification_documents(user_id, document_type);

-- ============================================================================
-- VERIFICATION COMMENTS TABLE
-- ============================================================================

CREATE TABLE verification_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES verification_documents(id) ON DELETE SET NULL,
    admin_id UUID NOT NULL REFERENCES users(id),
    admin_name VARCHAR(255) NOT NULL,
    
    -- Comment Details
    comment TEXT NOT NULL,
    action VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_action CHECK (action IN ('COMMENT', 'REQUEST_REUPLOAD', 'REQUEST_ADDITIONAL', 'APPROVE', 'REJECT'))
);

-- Create indexes for comments
CREATE INDEX idx_verification_comments_user_id ON verification_comments(user_id);
CREATE INDEX idx_verification_comments_document_id ON verification_comments(document_id);
CREATE INDEX idx_verification_comments_is_read ON verification_comments(user_id, is_read);

-- ============================================================================
-- AGENT VERIFICATION PROFILE TABLE
-- ============================================================================

-- This extends the agents table with additional verification info
CREATE TABLE IF NOT EXISTS agent_verification_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Business Information
    business_type VARCHAR(50) NOT NULL DEFAULT 'INDIVIDUAL',
    business_name VARCHAR(255),
    business_address TEXT,
    business_city VARCHAR(100),
    business_state VARCHAR(100),
    business_pincode VARCHAR(10),
    
    -- Contact Information
    primary_phone VARCHAR(20),
    secondary_phone VARCHAR(20),
    whatsapp_number VARCHAR(20),
    business_email VARCHAR(255),
    website_url VARCHAR(255),
    
    -- Verification Info
    pan_number VARCHAR(10),
    gstin VARCHAR(15),
    iata_number VARCHAR(20),
    
    -- Verification Progress
    verification_started_at TIMESTAMP WITH TIME ZONE,
    verification_completed_at TIMESTAMP WITH TIME ZONE,
    last_document_uploaded_at TIMESTAMP WITH TIME ZONE,
    
    -- Flags
    first_login_prompt_shown BOOLEAN NOT NULL DEFAULT FALSE,
    documents_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_business_type CHECK (business_type IN ('INDIVIDUAL', 'PROPRIETORSHIP', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'LLP', 'PUBLIC_LIMITED'))
);

-- Create index for faster lookups
CREATE INDEX idx_agent_verification_profiles_user_id ON agent_verification_profiles(user_id);
CREATE INDEX idx_agent_verification_profiles_agent_id ON agent_verification_profiles(agent_id);

-- ============================================================================
-- VERIFICATION HISTORY TABLE
-- ============================================================================

CREATE TABLE verification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES verification_documents(id) ON DELETE SET NULL,
    
    -- Action Details
    action VARCHAR(100) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_by_name VARCHAR(255) NOT NULL,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for history
CREATE INDEX idx_verification_history_user_id ON verification_history(user_id);
CREATE INDEX idx_verification_history_document_id ON verification_history(document_id);
CREATE INDEX idx_verification_history_created_at ON verification_history(created_at);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_verification_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for verification_documents
CREATE TRIGGER update_verification_documents_timestamp
    BEFORE UPDATE ON verification_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_document_timestamp();

-- Trigger for agent_verification_profiles
CREATE TRIGGER update_agent_verification_profiles_timestamp
    BEFORE UPDATE ON agent_verification_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_document_timestamp();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_verification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;

-- Policies for verification_documents
CREATE POLICY "Users can view their own documents"
    ON verification_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
    ON verification_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
    ON verification_documents FOR UPDATE
    USING (auth.uid() = user_id AND status IN ('NOT_UPLOADED', 'REJECTED', 'REUPLOAD_REQUESTED'));

-- Admin policies (assuming admin check via JWT role)
CREATE POLICY "Admins can view all documents"
    ON verification_documents FOR SELECT
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update all documents"
    ON verification_documents FOR UPDATE
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Policies for verification_comments
CREATE POLICY "Users can view their own comments"
    ON verification_comments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert comments"
    ON verification_comments FOR INSERT
    WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can update read status of their comments"
    ON verification_comments FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for agent_verification_profiles
CREATE POLICY "Users can view their own profile"
    ON agent_verification_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON agent_verification_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON agent_verification_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON agent_verification_profiles FOR SELECT
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Policies for verification_history
CREATE POLICY "Users can view their own history"
    ON verification_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all history"
    ON verification_history FOR SELECT
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can insert history"
    ON verification_history FOR INSERT
    WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON verification_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON verification_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON agent_verification_profiles TO authenticated;
GRANT SELECT ON verification_history TO authenticated;
GRANT INSERT ON verification_history TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE verification_documents IS 'Stores all uploaded verification documents for agents';
COMMENT ON TABLE verification_comments IS 'Stores admin comments and feedback for verification documents';
COMMENT ON TABLE agent_verification_profiles IS 'Extended verification profile for agents including business details';
COMMENT ON TABLE verification_history IS 'Audit trail of all verification actions';

COMMENT ON COLUMN verification_documents.extracted_data IS 'JSON containing OCR/manual extracted data like document number, expiry date, etc.';
COMMENT ON COLUMN verification_documents.status IS 'Document verification status: NOT_UPLOADED, PENDING_REVIEW, APPROVED, REJECTED, EXPIRED, REUPLOAD_REQUESTED';
COMMENT ON COLUMN verification_comments.action IS 'Type of admin action: COMMENT, REQUEST_REUPLOAD, REQUEST_ADDITIONAL, APPROVE, REJECT';
