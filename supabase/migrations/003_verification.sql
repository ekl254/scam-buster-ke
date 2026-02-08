-- ScamBusterKE Verification System
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. ADD VERIFICATION COLUMNS TO REPORTS
-- ============================================

-- Reporter verification and evidence scoring
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_phone_hash TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_ip_hash TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_verified BOOLEAN DEFAULT false;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_score INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS verification_tier INTEGER DEFAULT 1;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT false;

-- Create indexes for verification queries
CREATE INDEX IF NOT EXISTS idx_reports_phone_hash ON reports(reporter_phone_hash);
CREATE INDEX IF NOT EXISTS idx_reports_verification_tier ON reports(verification_tier);
CREATE INDEX IF NOT EXISTS idx_reports_expires_at ON reports(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_identifier_tier ON reports(identifier, verification_tier);

-- ============================================
-- 2. DISPUTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  disputed_by_phone_hash TEXT NOT NULL,
  disputed_by_verified BOOLEAN DEFAULT false,
  reason TEXT NOT NULL,
  evidence_url TEXT,
  business_reg_number TEXT,
  contact_phone_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'upheld', 'rejected')),
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_report_id ON disputes(report_id);
CREATE INDEX IF NOT EXISTS idx_disputes_identifier ON disputes(identifier);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- Enable RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Anyone can create disputes
CREATE POLICY "Anyone can create disputes" ON disputes
  FOR INSERT WITH CHECK (true);

-- Anyone can view their own disputes (by phone hash)
CREATE POLICY "Users can view their disputes" ON disputes
  FOR SELECT USING (true);

-- ============================================
-- 3. PHONE VERIFICATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_hash TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_hash ON phone_verifications(phone_hash);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);

-- Enable RLS
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Only server can manage verifications (via service role)
CREATE POLICY "Server manages verifications" ON phone_verifications
  FOR ALL USING (true);

-- ============================================
-- 4. VERIFIED REPORTERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS verified_reporters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_hash TEXT UNIQUE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verification_method TEXT DEFAULT 'otp',
  report_count INTEGER DEFAULT 0,
  trust_level INTEGER DEFAULT 1 CHECK (trust_level BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_verified_reporters_phone_hash ON verified_reporters(phone_hash);

-- Enable RLS
ALTER TABLE verified_reporters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified reporters viewable" ON verified_reporters
  FOR SELECT USING (true);

-- ============================================
-- 5. FUNCTION: CALCULATE EVIDENCE SCORE
-- ============================================

CREATE OR REPLACE FUNCTION calculate_evidence_score(
  p_evidence_url TEXT,
  p_transaction_id TEXT,
  p_description TEXT,
  p_reporter_verified BOOLEAN,
  p_amount_lost INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Evidence screenshot provided
  IF p_evidence_url IS NOT NULL AND p_evidence_url != '' THEN
    score := score + 20;
  END IF;

  -- Transaction ID provided
  IF p_transaction_id IS NOT NULL AND p_transaction_id != '' THEN
    score := score + 15;
  END IF;

  -- Detailed description (>100 chars)
  IF LENGTH(p_description) > 100 THEN
    score := score + 10;
  ELSIF LENGTH(p_description) > 50 THEN
    score := score + 5;
  END IF;

  -- Reporter is phone-verified
  IF p_reporter_verified THEN
    score := score + 15;
  END IF;

  -- Amount lost specified
  IF p_amount_lost IS NOT NULL AND p_amount_lost > 0 THEN
    score := score + 10;
  END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 6. FUNCTION: CALCULATE VERIFICATION TIER
-- ============================================

CREATE OR REPLACE FUNCTION calculate_verification_tier(
  p_identifier TEXT,
  p_evidence_score INTEGER,
  p_has_official_source BOOLEAN DEFAULT false
)
RETURNS INTEGER AS $$
DECLARE
  report_count INTEGER;
  independent_count INTEGER;
BEGIN
  -- Count total reports for this identifier
  SELECT COUNT(*) INTO report_count
  FROM reports
  WHERE LOWER(identifier) = LOWER(p_identifier)
    AND is_expired = false;

  -- Count independent reports (different reporter phone hashes)
  SELECT COUNT(DISTINCT reporter_phone_hash) INTO independent_count
  FROM reports
  WHERE LOWER(identifier) = LOWER(p_identifier)
    AND reporter_phone_hash IS NOT NULL
    AND is_expired = false;

  -- Tier 3: Verified (official source or 5+ independent reports with evidence)
  IF p_has_official_source THEN
    RETURN 3;
  END IF;

  IF independent_count >= 5 AND p_evidence_score >= 30 THEN
    RETURN 3;
  END IF;

  -- Tier 2: Corroborated (2-4 independent reports or 1 with evidence)
  IF independent_count >= 2 THEN
    RETURN 2;
  END IF;

  IF p_evidence_score >= 30 THEN
    RETURN 2;
  END IF;

  -- Tier 1: Unverified (single report, no strong evidence)
  RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. FUNCTION: CALCULATE REPORT WEIGHT WITH DECAY
-- ============================================

CREATE OR REPLACE FUNCTION calculate_report_weight(
  p_created_at TIMESTAMP WITH TIME ZONE,
  p_verification_tier INTEGER,
  p_evidence_score INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
  age_days INTEGER;
  base_weight NUMERIC;
  decay_multiplier NUMERIC;
BEGIN
  age_days := EXTRACT(DAY FROM NOW() - p_created_at);

  -- Base weight by tier
  base_weight := CASE p_verification_tier
    WHEN 3 THEN 1.0
    WHEN 2 THEN 0.75
    ELSE 0.5
  END;

  -- Add evidence score bonus (0-0.3)
  base_weight := base_weight + (p_evidence_score::NUMERIC / 100 * 0.3);

  -- Apply decay
  decay_multiplier := CASE
    WHEN age_days <= 30 THEN 1.0
    WHEN age_days <= 90 THEN 0.75
    WHEN age_days <= 180 THEN 0.5
    ELSE 0.25
  END;

  RETURN base_weight * decay_multiplier;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 8. FUNCTION: GET COMMUNITY CONCERN LEVEL
-- ============================================

CREATE OR REPLACE FUNCTION get_community_concern_level(
  p_identifier TEXT
)
RETURNS TABLE (
  concern_level TEXT,
  concern_score INTEGER,
  total_reports INTEGER,
  verified_reports INTEGER,
  total_amount_lost BIGINT,
  weighted_score NUMERIC,
  has_disputes BOOLEAN,
  disclaimer TEXT
) AS $$
DECLARE
  v_total_reports INTEGER;
  v_verified_reports INTEGER;
  v_total_amount BIGINT;
  v_weighted_score NUMERIC;
  v_has_disputes BOOLEAN;
  v_concern_score INTEGER;
  v_concern_level TEXT;
BEGIN
  -- Get report stats
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE verification_tier >= 2),
    COALESCE(SUM(amount_lost), 0),
    COALESCE(SUM(calculate_report_weight(created_at, verification_tier, evidence_score)), 0)
  INTO v_total_reports, v_verified_reports, v_total_amount, v_weighted_score
  FROM reports
  WHERE LOWER(identifier) = LOWER(p_identifier)
    AND is_expired = false;

  -- Check for disputes
  SELECT EXISTS(
    SELECT 1 FROM disputes
    WHERE LOWER(identifier) = LOWER(p_identifier)
      AND status IN ('pending', 'under_review')
  ) INTO v_has_disputes;

  -- Calculate concern score (0-100, higher = more concerning)
  IF v_total_reports = 0 THEN
    v_concern_score := 0;
    v_concern_level := 'no_reports';
  ELSIF v_weighted_score < 0.5 THEN
    v_concern_score := 20;
    v_concern_level := 'low';
  ELSIF v_weighted_score < 1.5 THEN
    v_concern_score := 40;
    v_concern_level := 'moderate';
  ELSIF v_weighted_score < 3.0 THEN
    v_concern_score := 70;
    v_concern_level := 'high';
  ELSE
    v_concern_score := 90;
    v_concern_level := 'severe';
  END IF;

  -- Reduce score if disputed
  IF v_has_disputes AND v_concern_score > 0 THEN
    v_concern_score := v_concern_score - 10;
  END IF;

  RETURN QUERY SELECT
    v_concern_level,
    v_concern_score,
    v_total_reports,
    v_verified_reports,
    v_total_amount,
    v_weighted_score,
    v_has_disputes,
    'Reports are user-submitted and not independently verified by ScamBusterKE. Use this information as one factor in your decision-making.'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. TRIGGER: SET EXPIRATION ON INSERT
-- ============================================

CREATE OR REPLACE FUNCTION set_report_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate evidence score
  NEW.evidence_score := calculate_evidence_score(
    NEW.evidence_url,
    NEW.transaction_id,
    NEW.description,
    NEW.reporter_verified,
    NEW.amount_lost
  );

  -- Set expiration for tier 1 reports (90 days)
  IF NEW.evidence_score < 30 AND NEW.reporter_verified = false THEN
    NEW.expires_at := NOW() + INTERVAL '90 days';
    NEW.verification_tier := 1;
  ELSIF NEW.evidence_score >= 30 OR NEW.reporter_verified THEN
    NEW.verification_tier := 2;
    NEW.expires_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_expiration ON reports;
CREATE TRIGGER trigger_set_expiration
BEFORE INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION set_report_expiration();

-- ============================================
-- 10. TRIGGER: UPDATE VERIFICATION TIER ON CHANGES
-- ============================================

CREATE OR REPLACE FUNCTION update_verification_tiers()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new report is added, update tiers for all reports with same identifier
  UPDATE reports
  SET verification_tier = calculate_verification_tier(
    NEW.identifier,
    evidence_score,
    false
  )
  WHERE LOWER(identifier) = LOWER(NEW.identifier);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tiers ON reports;
CREATE TRIGGER trigger_update_tiers
AFTER INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION update_verification_tiers();

-- ============================================
-- 11. FUNCTION: EXPIRE OLD REPORTS
-- ============================================

CREATE OR REPLACE FUNCTION expire_old_reports()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE reports
  SET is_expired = true
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_expired = false
    AND verification_tier = 1;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 12. UPDATED SEARCH FUNCTION WITH VERIFICATION
-- ============================================

CREATE OR REPLACE FUNCTION search_reports_v2(
  search_query TEXT,
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 20,
  include_expired BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  identifier TEXT,
  identifier_type TEXT,
  scam_type TEXT,
  description TEXT,
  amount_lost INTEGER,
  upvotes INTEGER,
  is_anonymous BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  verification_tier INTEGER,
  evidence_score INTEGER,
  reporter_verified BOOLEAN,
  is_expired BOOLEAN,
  total_count BIGINT
) AS $$
DECLARE
  offset_val INTEGER;
BEGIN
  offset_val := (page_number - 1) * page_size;

  RETURN QUERY
  WITH matched_reports AS (
    SELECT
      r.id,
      r.identifier,
      r.identifier_type,
      r.scam_type,
      r.description,
      r.amount_lost,
      r.upvotes,
      r.is_anonymous,
      r.created_at,
      r.verification_tier,
      r.evidence_score,
      r.reporter_verified,
      r.is_expired,
      COUNT(*) OVER() as total_count
    FROM reports r
    WHERE
      (r.search_vector @@ plainto_tsquery('english', search_query)
       OR r.identifier ILIKE '%' || search_query || '%')
      AND (include_expired OR r.is_expired = false)
    ORDER BY
      r.verification_tier DESC,
      ts_rank(r.search_vector, plainto_tsquery('english', search_query)) DESC,
      r.created_at DESC
    LIMIT page_size
    OFFSET offset_val
  )
  SELECT * FROM matched_reports;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION calculate_evidence_score TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_verification_tier TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_report_weight TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_community_concern_level TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_reports_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION expire_old_reports TO authenticated;
