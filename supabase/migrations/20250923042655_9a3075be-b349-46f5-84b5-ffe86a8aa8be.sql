-- Create materialized view for donations in the last 30 days
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_donations_30d AS
SELECT date_trunc('day', created_at) as day,
       sum(amount)::numeric as total_amount,
       count(*)::bigint as donation_count
FROM donations
WHERE created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;

-- Create unique index to enable concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_donations_30d_day_uidx ON mv_donations_30d (day);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_mv_donations_30d()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_donations_30d;
END $$;