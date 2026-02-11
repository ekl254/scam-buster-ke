-- ScamBusterKE Database Schema (Consolidated)
-- Run this in your Supabase SQL Editor for a fresh setup.
-- For an existing database, use the migrations in supabase/migrations/ instead.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Reports table - stores all scam reports
-- ============================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('phone', 'paybill', 'till', 'website', 'company', 'email')),
  scam_type TEXT NOT NULL CHECK (scam_type IN ('mpesa', 'land', 'jobs', 'investment', 'tender', 'online', 'romance', 'other')),
  description TEXT NOT NULL,
  amount_lost INTEGER DEFAULT NULL,
  evidence_url TEXT,
  transaction_id TEXT,
  source_url TEXT,
  reporter_id UUID REFERENCES auth.users(id),
  reporter_phone_hash TEXT,
  reporter_ip_hash TEXT,
  reporter_verified BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT true,
  upvotes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'verified', 'disputed', 'rejected')),
  verification_tier INTEGER DEFAULT 1 CHECK (verification_tier IN (1, 2, 3)),
  evidence_score INTEGER DEFAULT 0,
  is_expired BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_identifier ON reports(identifier);
CREATE INDEX idx_reports_identifier_lower ON reports(LOWER(identifier));
CREATE INDEX idx_reports_scam_type ON reports(scam_type);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_verification_tier ON reports(verification_tier DESC);

-- ============================================================
-- Lookups table - track search analytics
-- ============================================================
CREATE TABLE lookups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,
  found_reports_count INTEGER DEFAULT 0,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lookups_identifier ON lookups(identifier);
CREATE INDEX idx_lookups_searched_at ON lookups(searched_at DESC);

-- ============================================================
-- Upvotes table
-- ============================================================
CREATE TABLE upvotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(report_id, user_id),
  UNIQUE(report_id, session_id)
);

-- ============================================================
-- Disputes table
-- ============================================================
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id),
  identifier TEXT NOT NULL,
  disputed_by_phone_hash TEXT,
  disputed_by_verified BOOLEAN DEFAULT false,
  reason TEXT NOT NULL,
  evidence_url TEXT,
  business_reg_number TEXT,
  contact_phone_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'upheld', 'rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_disputes_identifier ON disputes(identifier);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================================
-- Phone verifications table
-- ============================================================
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_hash TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_phone_verifications_phone ON phone_verifications(phone_hash, created_at DESC);

-- ============================================================
-- Verified reporters table
-- ============================================================
CREATE TABLE verified_reporters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_hash TEXT UNIQUE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verification_method TEXT DEFAULT 'otp',
  trust_level INTEGER DEFAULT 1,
  report_count INTEGER DEFAULT 0
);

-- ============================================================
-- Stats table (cached aggregates, kept in sync by triggers)
-- ============================================================
CREATE TABLE stats (
  id TEXT PRIMARY KEY DEFAULT 'global',
  total_reports INTEGER DEFAULT 0,
  total_amount_lost BIGINT DEFAULT 0,
  total_lookups INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO stats (id) VALUES ('global') ON CONFLICT DO NOTHING;

-- ============================================================
-- Rate limits table (for serverless-safe rate limiting)
-- ============================================================
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_key_created ON rate_limits(key, created_at DESC);

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Upvote counter
CREATE OR REPLACE FUNCTION update_report_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reports SET upvotes = upvotes + 1 WHERE id = NEW.report_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reports SET upvotes = upvotes - 1 WHERE id = OLD.report_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_upvotes
AFTER INSERT OR DELETE ON upvotes
FOR EACH ROW EXECUTE FUNCTION update_report_upvotes();

-- Increment verified reporter count
CREATE OR REPLACE FUNCTION increment_reporter_count(p_phone_hash TEXT)
RETURNS void AS $$
BEGIN
  UPDATE verified_reporters SET report_count = report_count + 1 WHERE phone_hash = p_phone_hash;
END;
$$ LANGUAGE plpgsql;

-- Identifier stats
CREATE OR REPLACE FUNCTION get_identifier_stats(search_identifier TEXT)
RETURNS TABLE (
  identifier TEXT,
  identifier_type TEXT,
  report_count BIGINT,
  total_amount_lost BIGINT,
  trust_score INTEGER,
  scam_types TEXT[],
  latest_report TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.identifier,
    r.identifier_type,
    COUNT(*)::BIGINT as report_count,
    COALESCE(SUM(r.amount_lost), 0)::BIGINT as total_amount_lost,
    CASE
      WHEN COUNT(*) = 0 THEN 100
      WHEN COUNT(*) = 1 THEN 70
      WHEN COUNT(*) <= 3 THEN 40
      WHEN COUNT(*) <= 5 THEN 20
      ELSE 0
    END as trust_score,
    ARRAY_AGG(DISTINCT r.scam_type) as scam_types,
    MAX(r.created_at) as latest_report
  FROM reports r
  WHERE LOWER(r.identifier) LIKE LOWER('%' || search_identifier || '%')
    AND r.status = 'approved'
    AND (r.is_expired = false OR r.is_expired IS NULL)
  GROUP BY r.identifier, r.identifier_type;
END;
$$ LANGUAGE plpgsql;

-- Rate limit cleanup
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_reporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Reports
CREATE POLICY "Reports are viewable by everyone" ON reports
  FOR SELECT USING (true);
CREATE POLICY "Anyone can create reports with pending status" ON reports
  FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "Authenticated users can update their own reports" ON reports
  FOR UPDATE USING (auth.uid() = reporter_id);

-- Lookups
CREATE POLICY "Anyone can create lookups" ON lookups
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Lookups are viewable with service role" ON lookups
  FOR SELECT USING (true);

-- Upvotes
CREATE POLICY "Upvotes are viewable by everyone" ON upvotes
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upvote" ON upvotes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR session_id IS NOT NULL);
CREATE POLICY "Users can remove their own upvotes" ON upvotes
  FOR DELETE USING (auth.uid() = user_id);

-- Disputes
CREATE POLICY "Disputes are viewable by everyone" ON disputes
  FOR SELECT USING (true);
CREATE POLICY "Anyone can create disputes" ON disputes
  FOR INSERT WITH CHECK (true);

-- Phone verifications
CREATE POLICY "Phone verifications are manageable" ON phone_verifications
  FOR ALL USING (true) WITH CHECK (true);

-- Verified reporters
CREATE POLICY "Verified reporters are readable" ON verified_reporters
  FOR SELECT USING (true);
CREATE POLICY "Verified reporters can be created" ON verified_reporters
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Verified reporters can be updated" ON verified_reporters
  FOR UPDATE USING (true);

-- Stats
CREATE POLICY "Stats are viewable by everyone" ON stats
  FOR SELECT USING (true);

-- Rate limits
CREATE POLICY "Allow rate limit inserts" ON rate_limits
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow rate limit reads" ON rate_limits
  FOR SELECT USING (true);
