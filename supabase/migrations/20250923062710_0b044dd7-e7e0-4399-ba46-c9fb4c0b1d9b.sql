-- Fix security warnings by adding search_path to functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() ->> 'is_admin')::BOOLEAN, FALSE);
$$;

-- Admin ledger (daily) - fix search path
CREATE OR REPLACE FUNCTION admin_ledger_daily(p_start DATE DEFAULT NULL, p_end DATE DEFAULT NULL)
RETURNS SETOF vw_ledger_daily
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT * FROM vw_ledger_daily
    WHERE (p_start IS NULL OR day >= p_start)
      AND (p_end IS NULL OR day < (p_end + INTERVAL '1 day'))
    ORDER BY day DESC;
END $$;

-- Admin ledger (by campaign) - fix search path
CREATE OR REPLACE FUNCTION admin_ledger_by_campaign()
RETURNS SETOF vw_ledger_by_campaign
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT * FROM vw_ledger_by_campaign;
END $$;

-- Admin payouts - fix search path
CREATE OR REPLACE FUNCTION admin_payouts()
RETURNS TABLE (
  id UUID,
  organizer_id UUID,
  stripe_account_id TEXT,
  stripe_payout_id TEXT,
  amount_cents BIGINT,
  currency TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.organizer_id, p.stripe_account_id, p.stripe_payout_id,
           p.amount_cents, p.currency, p.status, p.created_at
    FROM payouts p ORDER BY p.created_at DESC;
END $$;