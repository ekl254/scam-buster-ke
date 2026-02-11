-- Flags table for user moderation
CREATE TABLE IF NOT EXISTS flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

-- Anyone can insert flags
CREATE POLICY "Anyone can create flags" ON flags
  FOR INSERT WITH CHECK (true);

-- Only admins can view/manage flags (via service role)
-- No select policy for public users
