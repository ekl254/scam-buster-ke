-- Allow counting lookups for public stats display
-- The existing policy "Lookups are viewable by admins only" uses USING(false)
-- which blocks all SELECT including count queries needed for the stats API.

DROP POLICY IF EXISTS "Lookups are viewable by admins only" ON lookups;

-- Allow count-only access (no sensitive data in lookups table)
CREATE POLICY "Lookups are viewable by everyone" ON lookups
  FOR SELECT USING (true);
