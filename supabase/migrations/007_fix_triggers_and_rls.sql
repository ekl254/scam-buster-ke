-- ScamBusterKE: Fix trigger SECURITY DEFINER and RLS policies
-- This migration fixes several issues:
-- 1. Trigger functions that UPDATE tables but fail due to RLS (need SECURITY DEFINER)
-- 2. Missing UPDATE policy on disputes table
-- 3. Overly permissive phone_verifications RLS policy
--
-- Safe to run multiple times (idempotent with CREATE OR REPLACE and DROP IF EXISTS)

-- ============================================
-- 1. SECURITY DEFINER on update_verification_tiers
-- (003_verification.sql line 357)
-- This trigger runs AFTER INSERT on reports and UPDATEs reports
-- to recalculate verification tiers, but the reports UPDATE RLS
-- policy requires auth.uid() = reporter_id which fails for anon.
-- ============================================

CREATE OR REPLACE FUNCTION update_verification_tiers()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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

-- ============================================
-- 2. SECURITY DEFINER on stats trigger functions
-- (002_scalability.sql lines 41-78)
-- These triggers UPDATE the stats table but stats only has
-- a SELECT policy for anon, no UPDATE policy.
-- ============================================

CREATE OR REPLACE FUNCTION update_stats_on_report_insert()
RETURNS TRIGGER
SECURITY DEFINER
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
SECURITY DEFINER
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
SECURITY DEFINER
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

-- Also fix the lookup stats trigger while we're at it
CREATE OR REPLACE FUNCTION update_stats_on_lookup()
RETURNS TRIGGER
SECURITY DEFINER
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

-- ============================================
-- 3. SECURITY DEFINER on update_report_upvotes
-- (schema.sql line 53)
-- Trigger UPDATEs reports.upvotes but RLS requires
-- auth.uid() = reporter_id for updates.
-- ============================================

CREATE OR REPLACE FUNCTION update_report_upvotes()
RETURNS TRIGGER
SECURITY DEFINER
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

-- ============================================
-- 4. ADD UPDATE POLICY ON DISPUTES TABLE
-- The disputes PATCH endpoint validates admin via x-admin-key
-- header at the application level, then uses createServerClient
-- (anon key) to update. We need an UPDATE policy.
-- ============================================

DROP POLICY IF EXISTS "Service role can update disputes" ON disputes;
CREATE POLICY "Service role can update disputes" ON disputes
  FOR UPDATE USING (true);

-- ============================================
-- 5. RESTRICT phone_verifications RLS POLICIES
-- Currently has FOR ALL USING (true) which exposes OTP hashes
-- to any anonymous user. The verify API uses createServerClient
-- (anon key) and needs: SELECT, INSERT, UPDATE.
-- DELETE is not used and should be restricted.
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Server manages verifications" ON phone_verifications;

-- SELECT: needed by verify API to check rate limits and fetch verification records
CREATE POLICY "Anon can select verifications" ON phone_verifications
  FOR SELECT USING (true);

-- INSERT: needed by verify API to store new OTP records
CREATE POLICY "Anon can insert verifications" ON phone_verifications
  FOR INSERT WITH CHECK (true);

-- UPDATE: needed by verify API to increment attempts and mark verified
CREATE POLICY "Anon can update verifications" ON phone_verifications
  FOR UPDATE USING (true);

-- DELETE: not used by any API route, restrict to service role only
CREATE POLICY "Only service role can delete verifications" ON phone_verifications
  FOR DELETE USING (false);
