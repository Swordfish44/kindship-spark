-- Fix function search path security warning
CREATE OR REPLACE FUNCTION refresh_mv_donations_30d()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_donations_30d;
END $$;