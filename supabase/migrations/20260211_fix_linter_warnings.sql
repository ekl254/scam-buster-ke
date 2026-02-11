-- Fix Supabase linter warnings: search_path on functions + auth.uid() initplan in RLS

-- 1. Fix mutable search_path on functions
CREATE OR REPLACE FUNCTION update_report_upvotes()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reports SET upvotes = upvotes + 1 WHERE id = NEW.report_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reports SET upvotes = upvotes - 1 WHERE id = OLD.report_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_reporter_count(p_phone_hash TEXT)
RETURNS void
SET search_path = public
AS $$
BEGIN
  UPDATE verified_reporters SET report_count = report_count + 1 WHERE phone_hash = p_phone_hash;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_identifier_stats(search_identifier TEXT)
RETURNS TABLE (
  identifier TEXT,
  identifier_type TEXT,
  report_count BIGINT,
  total_amount_lost BIGINT,
  trust_score INTEGER,
  scam_types TEXT[],
  latest_report TIMESTAMP WITH TIME ZONE
)
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Functions from 002_scalability.sql
CREATE OR REPLACE FUNCTION update_stats_on_report_insert()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  UPDATE stats SET
    total_reports = total_reports + 1,
    total_amount_lost = total_amount_lost + COALESCE(NEW.amount_lost, 0),
    updated_at = NOW()
  WHERE id = 'global';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_stats_on_report_delete()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  UPDATE stats SET
    total_reports = total_reports - 1,
    total_amount_lost = total_amount_lost - COALESCE(OLD.amount_lost, 0),
    updated_at = NOW()
  WHERE id = 'global';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_stats_on_report_update()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  IF OLD.amount_lost IS DISTINCT FROM NEW.amount_lost THEN
    UPDATE stats SET
      total_amount_lost = total_amount_lost - COALESCE(OLD.amount_lost, 0) + COALESCE(NEW.amount_lost, 0),
      updated_at = NOW()
    WHERE id = 'global';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_stats_on_lookup()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  UPDATE stats SET
    total_lookups = total_lookups + 1,
    updated_at = NOW()
  WHERE id = 'global';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_reports(
  search_query TEXT,
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 20
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
  total_count BIGINT
)
SET search_path = public
AS $$
DECLARE
  offset_val INTEGER;
BEGIN
  offset_val := (page_number - 1) * page_size;
  RETURN QUERY
  WITH matched_reports AS (
    SELECT
      r.id, r.identifier, r.identifier_type, r.scam_type, r.description,
      r.amount_lost, r.upvotes, r.is_anonymous, r.created_at,
      COUNT(*) OVER() as total_count
    FROM reports r
    WHERE
      (r.search_vector @@ plainto_tsquery('english', search_query)
       OR r.identifier ILIKE '%' || search_query || '%')
    ORDER BY
      ts_rank(r.search_vector, plainto_tsquery('english', search_query)) DESC,
      r.created_at DESC
    LIMIT page_size OFFSET offset_val
  )
  SELECT * FROM matched_reports;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_reports_paginated(
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 20,
  filter_scam_type TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'recent'
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
  total_count BIGINT
)
SET search_path = public
AS $$
DECLARE
  offset_val INTEGER;
BEGIN
  offset_val := (page_number - 1) * page_size;
  RETURN QUERY
  WITH filtered_reports AS (
    SELECT
      r.id, r.identifier, r.identifier_type, r.scam_type, r.description,
      r.amount_lost, r.upvotes, r.is_anonymous, r.created_at,
      COUNT(*) OVER() as total_count
    FROM reports r
    WHERE (filter_scam_type IS NULL OR r.scam_type = filter_scam_type)
    ORDER BY
      CASE WHEN sort_by = 'recent' THEN r.created_at END DESC,
      CASE WHEN sort_by = 'upvotes' THEN r.upvotes END DESC,
      CASE WHEN sort_by = 'amount' THEN r.amount_lost END DESC NULLS LAST
    LIMIT page_size OFFSET offset_val
  )
  SELECT * FROM filtered_reports;
END;
$$ LANGUAGE plpgsql;

-- Functions from 003_verification.sql
CREATE OR REPLACE FUNCTION calculate_evidence_score(
  p_evidence_url TEXT,
  p_transaction_id TEXT,
  p_description TEXT,
  p_reporter_verified BOOLEAN,
  p_amount_lost INTEGER
)
RETURNS INTEGER
SET search_path = public
AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  IF p_evidence_url IS NOT NULL AND p_evidence_url != '' THEN score := score + 20; END IF;
  IF p_transaction_id IS NOT NULL AND p_transaction_id != '' THEN score := score + 15; END IF;
  IF LENGTH(p_description) > 100 THEN score := score + 10;
  ELSIF LENGTH(p_description) > 50 THEN score := score + 5; END IF;
  IF p_reporter_verified THEN score := score + 15; END IF;
  IF p_amount_lost IS NOT NULL AND p_amount_lost > 0 THEN score := score + 10; END IF;
  RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION calculate_verification_tier(
  p_identifier TEXT,
  p_evidence_score INTEGER,
  p_has_official_source BOOLEAN DEFAULT false
)
RETURNS INTEGER
SET search_path = public
AS $$
DECLARE
  report_count INTEGER;
  independent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO report_count FROM reports
  WHERE LOWER(identifier) = LOWER(p_identifier) AND is_expired = false;
  SELECT COUNT(DISTINCT reporter_phone_hash) INTO independent_count FROM reports
  WHERE LOWER(identifier) = LOWER(p_identifier) AND reporter_phone_hash IS NOT NULL AND is_expired = false;
  IF p_has_official_source THEN RETURN 3; END IF;
  IF independent_count >= 5 AND p_evidence_score >= 30 THEN RETURN 3; END IF;
  IF independent_count >= 2 THEN RETURN 2; END IF;
  IF p_evidence_score >= 30 THEN RETURN 2; END IF;
  RETURN 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_report_weight(
  p_created_at TIMESTAMP WITH TIME ZONE,
  p_verification_tier INTEGER,
  p_evidence_score INTEGER
)
RETURNS NUMERIC
SET search_path = public
AS $$
DECLARE
  age_days INTEGER;
  base_weight NUMERIC;
  decay_multiplier NUMERIC;
BEGIN
  age_days := EXTRACT(DAY FROM NOW() - p_created_at);
  base_weight := CASE p_verification_tier WHEN 3 THEN 1.0 WHEN 2 THEN 0.75 ELSE 0.5 END;
  base_weight := base_weight + (p_evidence_score::NUMERIC / 100 * 0.3);
  decay_multiplier := CASE
    WHEN age_days <= 30 THEN 1.0 WHEN age_days <= 90 THEN 0.75
    WHEN age_days <= 180 THEN 0.5 ELSE 0.25 END;
  RETURN base_weight * decay_multiplier;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_community_concern_level(p_identifier TEXT)
RETURNS TABLE (
  concern_level TEXT, concern_score INTEGER, total_reports INTEGER,
  verified_reports INTEGER, total_amount_lost BIGINT, weighted_score NUMERIC,
  has_disputes BOOLEAN, disclaimer TEXT
)
SET search_path = public
AS $$
DECLARE
  v_total_reports INTEGER; v_verified_reports INTEGER;
  v_total_amount BIGINT; v_weighted_score NUMERIC;
  v_has_disputes BOOLEAN; v_concern_score INTEGER; v_concern_level TEXT;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE verification_tier >= 2),
    COALESCE(SUM(amount_lost), 0),
    COALESCE(SUM(calculate_report_weight(created_at, verification_tier, evidence_score)), 0)
  INTO v_total_reports, v_verified_reports, v_total_amount, v_weighted_score
  FROM reports WHERE LOWER(identifier) = LOWER(p_identifier) AND is_expired = false;
  SELECT EXISTS(SELECT 1 FROM disputes WHERE LOWER(identifier) = LOWER(p_identifier)
    AND status IN ('pending', 'under_review')) INTO v_has_disputes;
  IF v_total_reports = 0 THEN v_concern_score := 0; v_concern_level := 'no_reports';
  ELSIF v_weighted_score < 0.5 THEN v_concern_score := 20; v_concern_level := 'low';
  ELSIF v_weighted_score < 1.5 THEN v_concern_score := 40; v_concern_level := 'moderate';
  ELSIF v_weighted_score < 3.0 THEN v_concern_score := 70; v_concern_level := 'high';
  ELSE v_concern_score := 90; v_concern_level := 'severe'; END IF;
  IF v_has_disputes AND v_concern_score > 0 THEN v_concern_score := v_concern_score - 10; END IF;
  RETURN QUERY SELECT v_concern_level, v_concern_score, v_total_reports, v_verified_reports,
    v_total_amount, v_weighted_score, v_has_disputes,
    'Reports are user-submitted and not independently verified by ScamBusterKE. Use this information as one factor in your decision-making.'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- set_report_expiration (latest version from 005)
CREATE OR REPLACE FUNCTION set_report_expiration()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  NEW.evidence_score := calculate_evidence_score(
    NEW.evidence_url, NEW.transaction_id, NEW.description, NEW.reporter_verified, NEW.amount_lost
  );
  IF NEW.source_url IS NOT NULL AND NEW.source_url != '' THEN
    NEW.verification_tier := 3; NEW.expires_at := NULL;
  ELSIF NEW.evidence_score >= 30 OR NEW.reporter_verified THEN
    NEW.verification_tier := 2; NEW.expires_at := NULL;
  ELSE
    NEW.expires_at := NOW() + INTERVAL '90 days'; NEW.verification_tier := 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_verification_tiers()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  UPDATE reports SET verification_tier = calculate_verification_tier(
    NEW.identifier, evidence_score, source_url IS NOT NULL AND source_url != ''
  ) WHERE LOWER(identifier) = LOWER(NEW.identifier);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION expire_old_reports()
RETURNS INTEGER
SET search_path = public
AS $$
DECLARE expired_count INTEGER;
BEGIN
  UPDATE reports SET is_expired = true
  WHERE expires_at IS NOT NULL AND expires_at < NOW() AND is_expired = false AND verification_tier = 1;
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_reports_v2(
  search_query TEXT, page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 20, include_expired BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID, identifier TEXT, identifier_type TEXT, scam_type TEXT, description TEXT,
  amount_lost INTEGER, upvotes INTEGER, is_anonymous BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE, verification_tier INTEGER,
  evidence_score INTEGER, reporter_verified BOOLEAN, is_expired BOOLEAN, total_count BIGINT
)
SET search_path = public
AS $$
DECLARE offset_val INTEGER;
BEGIN
  offset_val := (page_number - 1) * page_size;
  RETURN QUERY
  WITH matched_reports AS (
    SELECT r.id, r.identifier, r.identifier_type, r.scam_type, r.description,
      r.amount_lost, r.upvotes, r.is_anonymous, r.created_at, r.verification_tier,
      r.evidence_score, r.reporter_verified, r.is_expired, COUNT(*) OVER() as total_count
    FROM reports r
    WHERE (r.search_vector @@ plainto_tsquery('english', search_query)
           OR r.identifier ILIKE '%' || search_query || '%')
      AND (include_expired OR r.is_expired = false)
    ORDER BY r.verification_tier DESC,
      ts_rank(r.search_vector, plainto_tsquery('english', search_query)) DESC, r.created_at DESC
    LIMIT page_size OFFSET offset_val
  )
  SELECT * FROM matched_reports;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix auth.uid() RLS initplan warnings (wrap in select for per-query eval instead of per-row)

-- Reports: update policy
DROP POLICY IF EXISTS "Authenticated users can update their own reports" ON reports;
CREATE POLICY "Authenticated users can update their own reports" ON reports
  FOR UPDATE USING ((select auth.uid()) = reporter_id);

-- Upvotes: insert policy
DROP POLICY IF EXISTS "Authenticated users can upvote" ON upvotes;
CREATE POLICY "Authenticated users can upvote" ON upvotes
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL OR session_id IS NOT NULL);

-- Upvotes: delete policy
DROP POLICY IF EXISTS "Users can remove their own upvotes" ON upvotes;
CREATE POLICY "Users can remove their own upvotes" ON upvotes
  FOR DELETE USING ((select auth.uid()) = user_id);
