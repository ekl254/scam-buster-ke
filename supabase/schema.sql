-- ScamBusterKE Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reports table - stores all scam reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('phone', 'paybill', 'till', 'website', 'company', 'email')),
  scam_type TEXT NOT NULL CHECK (scam_type IN ('mpesa', 'land', 'jobs', 'investment', 'tender', 'online', 'romance', 'other')),
  description TEXT NOT NULL,
  amount_lost INTEGER DEFAULT 0,
  evidence_url TEXT,
  reporter_id UUID REFERENCES auth.users(id),
  is_anonymous BOOLEAN DEFAULT true,
  upvotes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'disputed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX idx_reports_identifier ON reports(identifier);
CREATE INDEX idx_reports_identifier_lower ON reports(LOWER(identifier));
CREATE INDEX idx_reports_scam_type ON reports(scam_type);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Lookups table - track search analytics
CREATE TABLE lookups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,
  found_reports_count INTEGER DEFAULT 0,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lookups_identifier ON lookups(identifier);
CREATE INDEX idx_lookups_searched_at ON lookups(searched_at DESC);

-- Upvotes table - track who upvoted what (to prevent duplicate votes)
CREATE TABLE upvotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT, -- For anonymous upvotes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(report_id, user_id),
  UNIQUE(report_id, session_id)
);

-- Function to update upvote count
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

-- Trigger for upvote count
CREATE TRIGGER trigger_update_upvotes
AFTER INSERT OR DELETE ON upvotes
FOR EACH ROW EXECUTE FUNCTION update_report_upvotes();

-- Function to get aggregated stats for an identifier
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
  GROUP BY r.identifier, r.identifier_type;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;

-- Policies for reports
-- Anyone can read reports
CREATE POLICY "Reports are viewable by everyone" ON reports
  FOR SELECT USING (true);

-- Anyone can create reports
CREATE POLICY "Anyone can create reports" ON reports
  FOR INSERT WITH CHECK (true);

-- Only the reporter can update their own reports (if not anonymous)
CREATE POLICY "Users can update their own reports" ON reports
  FOR UPDATE USING (auth.uid() = reporter_id);

-- Policies for lookups (analytics)
CREATE POLICY "Anyone can create lookups" ON lookups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Lookups are viewable by admins only" ON lookups
  FOR SELECT USING (false); -- Change to admin role check later

-- Policies for upvotes
CREATE POLICY "Upvotes are viewable by everyone" ON upvotes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upvote" ON upvotes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR session_id IS NOT NULL);

CREATE POLICY "Users can remove their upvotes" ON upvotes
  FOR DELETE USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Sample data for testing
INSERT INTO reports (identifier, identifier_type, scam_type, description, amount_lost, is_anonymous) VALUES
('0712345678', 'phone', 'mpesa', 'Received fake M-Pesa message saying I won a promotion. They asked me to send 500 to claim my prize. Lost the money immediately.', 500, true),
('Pettmall Shelters', 'company', 'land', 'Paid 100k deposit for land in Kikuyu. Land search came back empty. Company stopped responding after I asked for refund.', 100000, false),
('0798765432', 'phone', 'jobs', 'Promised job in Dubai through Kazi Majuu program. Paid 50k for processing. No visa, no job, phone now off.', 50000, true),
('0723456789', 'phone', 'investment', 'Invested in crypto scheme promising 100% returns in a week. Lost everything.', 200000, true),
('547890', 'paybill', 'mpesa', 'Fake Safaricom Paybill. They called claiming I had won airtime and needed to pay tax.', 2000, true),
('Prime Ventures Ltd', 'company', 'tender', 'Fake tender for supply to Kenya Prisons. Paid 105k for tender documents. Company vanished.', 105000, false);
