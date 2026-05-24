-- ICAN Electronic Voting System - Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    district VARCHAR(50) NOT NULL,
    chapter VARCHAR(100),
    password_hash VARCHAR(256) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    role VARCHAR(30) DEFAULT 'member' CHECK (role IN ('member', 'super_admin', 'election_admin', 'auditor', 'observer', 'tech_support')),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(32),
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    last_login_device VARCHAR(500),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    photo_url VARCHAR(500),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_membership ON users(membership_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_district ON users(district);

-- Elections Table
CREATE TABLE elections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    election_type VARCHAR(20) NOT NULL CHECK (election_type IN ('national', 'state', 'district', 'chapter', 'committee')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'closed', 'cancelled', 'completed')),
    eligible_districts JSONB DEFAULT '[]',
    eligible_chapters JSONB DEFAULT '[]',
    eligible_roles JSONB DEFAULT '[]',
    voting_rule VARCHAR(20) DEFAULT 'single_choice' CHECK (voting_rule IN ('single_choice', 'multiple_choice', 'ranked', 'yes_no')),
    max_choices INTEGER DEFAULT 1,
    allow_abstain BOOLEAN DEFAULT TRUE,
    show_results_immediately BOOLEAN DEFAULT FALSE,
    results_publish_date TIMESTAMP,
    auto_start BOOLEAN DEFAULT FALSE,
    auto_close BOOLEAN DEFAULT TRUE,
    total_registered_voters INTEGER DEFAULT 0,
    total_accredited_voters INTEGER DEFAULT 0,
    total_votes_cast INTEGER DEFAULT 0,
    invalid_votes INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_elections_type ON elections(election_type);
CREATE INDEX idx_elections_dates ON elections(start_date, end_date);

-- Positions Table
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    position_name VARCHAR(100) NOT NULL,
    description TEXT,
    max_winners INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_positions_election ON positions(election_id);

-- Candidates Table
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    manifesto TEXT,
    biography TEXT,
    photo_url VARCHAR(500),
    certificates_url JSONB DEFAULT '[]',
    campaign_video_url VARCHAR(500),
    contact_email VARCHAR(120),
    contact_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disqualified', 'withdrawn')),
    nominated_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_candidates_position ON candidates(position_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_user ON candidates(user_id);

-- Votes Table (Encrypted)
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES elections(id),
    position_id UUID NOT NULL REFERENCES positions(id),
    candidate_id UUID NOT NULL REFERENCES candidates(id),
    voter_hash VARCHAR(128) NOT NULL,
    encrypted_vote BYTEA NOT NULL,
    ip_address VARCHAR(45),
    device_fingerprint VARCHAR(256),
    geolocation VARCHAR(100),
    cast_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_votes_election ON votes(election_id);
CREATE INDEX idx_votes_position ON votes(position_id);
CREATE INDEX idx_votes_candidate ON votes(candidate_id);
CREATE INDEX idx_votes_voter_hash ON votes(voter_hash);
CREATE UNIQUE INDEX idx_votes_unique ON votes(voter_hash, position_id);

-- Vote Receipts Table
CREATE TABLE vote_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vote_id UUID NOT NULL REFERENCES votes(id),
    receipt_code VARCHAR(64) UNIQUE NOT NULL,
    qr_code_url VARCHAR(500),
    verification_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receipts_code ON vote_receipts(receipt_code);

-- Audit Logs Table (Immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    user_role VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    action_description TEXT,
    election_id UUID REFERENCES elections(id),
    target_type VARCHAR(50),
    target_id UUID,
    ip_address VARCHAR(45),
    device_info VARCHAR(500),
    user_agent VARCHAR(500),
    geolocation VARCHAR(100),
    previous_hash VARCHAR(128),
    current_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_election ON audit_logs(election_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT,
    related_election_id UUID REFERENCES elections(id),
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_election ON notifications(related_election_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elections_updated_at BEFORE UPDATE ON elections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
