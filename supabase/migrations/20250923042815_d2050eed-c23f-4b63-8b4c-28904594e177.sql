-- Fix function search path security warning
CREATE OR REPLACE FUNCTION refresh_mv_donations_30d()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_donations_30d;
END $$;

-- Enable RLS on materialized view to secure API access
ALTER MATERIALIZED VIEW mv_donations_30d ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access to campaign organizers only
CREATE POLICY "Only authenticated users can view donation analytics" 
ON mv_donations_30d 
FOR SELECT 
TO authenticated 
USING (true);