-- Fix: Reports with source_url (from official/documented sources) should be Tier 3 (Verified)
-- The previous triggers ignored source_url when calculating verification tier,
-- causing all seeded reports to be downgraded to Tier 1 on insert.

-- 1. Update set_report_expiration to recognize source_url as official source
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

  -- Reports with source_url are from documented/official sources → Tier 3
  IF NEW.source_url IS NOT NULL AND NEW.source_url != '' THEN
    NEW.verification_tier := 3;
    NEW.expires_at := NULL;
  ELSIF NEW.evidence_score >= 30 OR NEW.reporter_verified THEN
    NEW.verification_tier := 2;
    NEW.expires_at := NULL;
  ELSE
    -- Tier 1: set 90-day expiration
    NEW.expires_at := NOW() + INTERVAL '90 days';
    NEW.verification_tier := 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update update_verification_tiers to check source_url
CREATE OR REPLACE FUNCTION update_verification_tiers()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new report is added, update tiers for all reports with same identifier
  UPDATE reports
  SET verification_tier = calculate_verification_tier(
    NEW.identifier,
    evidence_score,
    source_url IS NOT NULL AND source_url != ''
  )
  WHERE LOWER(identifier) = LOWER(NEW.identifier);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Fix existing seeded reports: set Tier 3 for all reports with source_url
UPDATE reports
SET verification_tier = 3,
    expires_at = NULL
WHERE source_url IS NOT NULL AND source_url != '';
