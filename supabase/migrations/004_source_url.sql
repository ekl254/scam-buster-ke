-- Add source_url column for tracing seeded/sourced reports
-- Run this in your Supabase SQL Editor

ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Index for filtering sourced vs community reports
CREATE INDEX IF NOT EXISTS idx_reports_source_url ON reports(source_url) WHERE source_url IS NOT NULL;
