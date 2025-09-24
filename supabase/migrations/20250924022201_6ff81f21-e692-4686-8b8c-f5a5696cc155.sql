-- Fix Security Definer View issues by properly dropping and recreating admin functions

-- Drop existing admin functions that depend on the views
DROP FUNCTION IF EXISTS public.admin_ledger_by_campaign();
DROP FUNCTION IF EXISTS public.admin_ledger_daily(date, date);

-- Now drop the problematic security definer views
DROP VIEW IF EXISTS public.vw_ledger_by_campaign CASCADE;
DROP VIEW IF EXISTS public.vw_ledger_daily CASCADE;

-- Recreate admin functions to work without the problematic views
CREATE OR REPLACE FUNCTION public.admin_ledger_by_campaign()
RETURNS TABLE(
  campaign_id uuid,
  title text,
  slug text,
  donations_count integer,
  gross_cents bigint,
  platform_fee_cents bigint,
  stripe_fee_cents bigint,
  refund_cents bigint,
  net_to_organizer_cents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.title,
    c.slug,
    COUNT(d.id)::integer as donations_count,
    COALESCE(SUM(d.amount_cents), 0)::bigint as gross_cents,
    COALESCE(SUM(d.platform_fee_cents), 0)::bigint as platform_fee_cents,
    COALESCE(SUM(d.stripe_fee_cents), 0)::bigint as stripe_fee_cents,
    COALESCE(SUM(d.refunded_cents), 0)::bigint as refund_cents,
    COALESCE(SUM(d.net_to_organizer_cents), 0)::bigint as net_to_organizer_cents
  FROM campaigns c
  LEFT JOIN donations d ON c.id = d.campaign_id
  GROUP BY c.id, c.title, c.slug
  ORDER BY gross_cents DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_ledger_daily(p_start date DEFAULT NULL, p_end date DEFAULT NULL)
RETURNS TABLE(
  day timestamp with time zone,
  donations_count integer,
  gross_cents bigint,
  platform_fee_cents bigint,
  stripe_fee_cents bigint,
  refund_cents bigint,
  net_to_organizer_cents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    date_trunc('day', d.created_at) as day,
    COUNT(d.id)::integer as donations_count,
    COALESCE(SUM(d.amount_cents), 0)::bigint as gross_cents,
    COALESCE(SUM(d.platform_fee_cents), 0)::bigint as platform_fee_cents,
    COALESCE(SUM(d.stripe_fee_cents), 0)::bigint as stripe_fee_cents,
    COALESCE(SUM(d.refunded_cents), 0)::bigint as refund_cents,
    COALESCE(SUM(d.net_to_organizer_cents), 0)::bigint as net_to_organizer_cents
  FROM donations d
  WHERE (p_start IS NULL OR d.created_at >= p_start)
    AND (p_end IS NULL OR d.created_at < (p_end + INTERVAL '1 day'))
  GROUP BY date_trunc('day', d.created_at)
  ORDER BY day DESC;
END $$;