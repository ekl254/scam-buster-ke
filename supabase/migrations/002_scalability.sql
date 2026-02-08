-- ScamBusterKE Scalability Improvements
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. STATS TABLE (for fast aggregate queries)
-- ============================================

CREATE TABLE IF NOT EXISTS stats (
  id TEXT PRIMARY KEY DEFAULT 'global',
  total_reports INTEGER DEFAULT 0,
  total_amount_lost BIGINT DEFAULT 0,
  total_lookups INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial stats row
INSERT INTO stats (id, total_reports, total_amount_lost, total_lookups)
SELECT 
  'global',
  COUNT(*),
  COALESCE(SUM(amount_lost), 0),
  0
FROM reports
ON CONFLICT (id) DO UPDATE SET
  total_reports = EXCLUDED.total_reports,
  total_amount_lost = EXCLUDED.total_amount_lost,
  updated_at = NOW();

-- Enable RLS
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

-- Anyone can read stats
CREATE POLICY "Stats are viewable by everyone" ON stats
  FOR SELECT USING (true);

-- ============================================
-- 2. TRIGGERS TO KEEP STATS IN SYNC
-- ============================================

-- Function to update stats when report is added
CREATE OR REPLACE FUNCTION update_stats_on_report_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stats SET
    total_reports = total_reports + 1,
    total_amount_lost = total_amount_lost + COALESCE(NEW.amount_lost, 0),
    updated_at = NOW()
  WHERE id = 'global';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update stats when report is deleted
CREATE OR REPLACE FUNCTION update_stats_on_report_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stats SET
    total_reports = total_reports - 1,
    total_amount_lost = total_amount_lost - COALESCE(OLD.amount_lost, 0),
    updated_at = NOW()
  WHERE id = 'global';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to update stats when report amount is updated
CREATE OR REPLACE FUNCTION update_stats_on_report_update()
RETURNS TRIGGER AS $$
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

-- Function to increment lookup count
CREATE OR REPLACE FUNCTION update_stats_on_lookup()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stats SET
    total_lookups = total_lookups + 1,
    updated_at = NOW()
  WHERE id = 'global';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_stats_insert ON reports;
CREATE TRIGGER trigger_stats_insert
AFTER INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION update_stats_on_report_insert();

DROP TRIGGER IF EXISTS trigger_stats_delete ON reports;
CREATE TRIGGER trigger_stats_delete
AFTER DELETE ON reports
FOR EACH ROW EXECUTE FUNCTION update_stats_on_report_delete();

DROP TRIGGER IF EXISTS trigger_stats_update ON reports;
CREATE TRIGGER trigger_stats_update
AFTER UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION update_stats_on_report_update();

DROP TRIGGER IF EXISTS trigger_lookup_stats ON lookups;
CREATE TRIGGER trigger_lookup_stats
AFTER INSERT ON lookups
FOR EACH ROW EXECUTE FUNCTION update_stats_on_lookup();

-- ============================================
-- 3. FULL-TEXT SEARCH INDEX
-- ============================================

-- Add a generated tsvector column for full-text search
ALTER TABLE reports ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(identifier, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B')
  ) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_reports_search ON reports USING GIN(search_vector);

-- ============================================
-- 4. OPTIMIZED SEARCH FUNCTION
-- ============================================

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
      COUNT(*) OVER() as total_count
    FROM reports r
    WHERE 
      r.search_vector @@ plainto_tsquery('english', search_query)
      OR r.identifier ILIKE '%' || search_query || '%'
    ORDER BY 
      ts_rank(r.search_vector, plainto_tsquery('english', search_query)) DESC,
      r.created_at DESC
    LIMIT page_size
    OFFSET offset_val
  )
  SELECT * FROM matched_reports;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. PAGINATED BROWSE FUNCTION
-- ============================================

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
) AS $$
DECLARE
  offset_val INTEGER;
BEGIN
  offset_val := (page_number - 1) * page_size;
  
  RETURN QUERY
  WITH filtered_reports AS (
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
      COUNT(*) OVER() as total_count
    FROM reports r
    WHERE 
      (filter_scam_type IS NULL OR r.scam_type = filter_scam_type)
    ORDER BY
      CASE WHEN sort_by = 'recent' THEN r.created_at END DESC,
      CASE WHEN sort_by = 'upvotes' THEN r.upvotes END DESC,
      CASE WHEN sort_by = 'amount' THEN r.amount_lost END DESC NULLS LAST
    LIMIT page_size
    OFFSET offset_val
  )
  SELECT * FROM filtered_reports;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

-- Allow anon/authenticated to call these functions
GRANT EXECUTE ON FUNCTION search_reports TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_reports_paginated TO anon, authenticated;
