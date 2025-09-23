-- Create materialized view for donations in the last 30 days
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_donations_30d AS
SELECT date_trunc('day', created_at) as day,
       sum(amount)::numeric as total_amount,
       count(*)::bigint as donation_count
FROM donations
WHERE created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;

-- Fast index for date filter
CREATE INDEX IF NOT EXISTS mv_donations_30d_day_idx ON mv_donations_30d (day);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_mv_donations_30d()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_donations_30d;
END $$;

-- Schedule refresh every 5 minutes using pg_cron
SELECT cron.schedule('refresh_mv_donations_30d', '*/5 * * * *', $$SELECT refresh_mv_donations_30d();$$);