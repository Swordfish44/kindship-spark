-- Enable RLS on receipt_logs table and add policies
ALTER TABLE receipt_logs ENABLE ROW LEVEL SECURITY;

-- Only service role (webhooks) can manage receipt logs
CREATE POLICY "Service role can manage receipt logs" ON receipt_logs
FOR ALL USING (true);

-- Grant necessary permissions to service role
GRANT ALL ON receipt_logs TO service_role;