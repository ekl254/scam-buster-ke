-- Migration: Add moderation queue (approved/rejected statuses) to reports.
-- Run this in Supabase SQL editor BEFORE deploying the code changes.

-- 1. Drop the old check constraint that only allows pending/verified/disputed
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;

-- 2. Add new check constraint that includes approved and rejected
ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('pending', 'approved', 'verified', 'disputed', 'rejected'));

-- 3. Approve all existing reports (they were created before moderation was implemented)
UPDATE reports SET status = 'approved' WHERE status = 'pending';
