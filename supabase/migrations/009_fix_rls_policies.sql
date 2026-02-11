-- Fix RLS policies to prevent direct API bypass
-- The previous "Anyone can create reports" policy allows inserting
-- directly via the anon key, skipping all server-side validation.
-- Instead, we restrict inserts to only allow pending reports through RLS
-- and add basic validation constraints.

-- Drop overly permissive insert policy
DROP POLICY IF EXISTS "Anyone can create reports" ON reports;

-- New insert policy: still allows anonymous inserts, but forces new reports
-- to start as 'pending' (the API also sets this, but RLS enforces it too)
CREATE POLICY "Anyone can create reports with pending status" ON reports
  FOR INSERT WITH CHECK (status = 'pending');

-- Add a service_role bypass for admin operations
-- (service_role key already bypasses RLS by default in Supabase)

-- Fix upvotes policy: the previous one allowed deleting any upvote with a session_id
DROP POLICY IF EXISTS "Users can remove their upvotes" ON upvotes;
CREATE POLICY "Users can remove their own upvotes" ON upvotes
  FOR DELETE USING (auth.uid() = user_id);

-- Also restrict direct report updates via anon key
DROP POLICY IF EXISTS "Users can update their own reports" ON reports;
CREATE POLICY "Authenticated users can update their own reports" ON reports
  FOR UPDATE USING (auth.uid() = reporter_id);
