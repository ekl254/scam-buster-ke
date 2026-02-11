-- Rate limiting table for serverless-safe rate limiting
-- This provides persistent rate limiting across serverless invocations

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_key_created ON rate_limits(key, created_at DESC);

-- Auto-cleanup old rate limit entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- RLS: allow inserts from anon, no reads needed from client
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow rate limit inserts" ON rate_limits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow rate limit reads" ON rate_limits
  FOR SELECT USING (true);
