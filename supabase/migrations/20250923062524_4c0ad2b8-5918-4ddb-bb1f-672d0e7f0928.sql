-- Helper: read a boolean claim `is_admin` from the JWT
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE SQL AS $$
  SELECT COALESCE((auth.jwt() ->> 'is_admin')::BOOLEAN, FALSE);
$$;

-- Admin ledger (daily)
CREATE OR REPLACE FUNCTION admin_ledger_daily(p_start DATE DEFAULT NULL, p_end DATE DEFAULT NULL)
RETURNS SETOF vw_ledger_daily
LANGUAGE plpgsql
SECURITY DEFINER AS $$
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
REVOKE ALL ON FUNCTION admin_ledger_daily(DATE,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_ledger_daily(DATE,DATE) TO authenticated;

-- Admin ledger (by campaign)
CREATE OR REPLACE FUNCTION admin_ledger_by_campaign()
RETURNS SETOF vw_ledger_by_campaign
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT * FROM vw_ledger_by_campaign;
END $$;
REVOKE ALL ON FUNCTION admin_ledger_by_campaign() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_ledger_by_campaign() TO authenticated;

-- Admin payouts
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
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.organizer_id, p.stripe_account_id, p.stripe_payout_id,
           p.amount_cents, p.currency, p.status, p.created_at
    FROM payouts p ORDER BY p.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION admin_payouts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_payouts() TO authenticated;