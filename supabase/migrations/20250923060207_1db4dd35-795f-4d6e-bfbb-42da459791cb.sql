-- First, add missing stripe_payout_id column to payouts table
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS stripe_payout_id TEXT;

-- Schema hardening: add missing columns and indexes
ALTER TABLE donations ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS stripe_balance_txn_id TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS stripe_fee_cents BIGINT DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS donations_created_idx ON donations (created_at DESC);
CREATE INDEX IF NOT EXISTS donations_campaign_idx ON donations (campaign_id);

-- Payouts: ensure Connect payout sync capability
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS payouts_stripe_payout_id_udx ON payouts (stripe_payout_id);
CREATE INDEX IF NOT EXISTS payouts_created_idx ON payouts (created_at DESC);

-- Ledger views for daily reporting
CREATE OR REPLACE VIEW vw_ledger_daily AS
SELECT
  DATE_TRUNC('day', d.created_at) AS day,
  COUNT(*)::INT AS donations_count,
  SUM(d.amount_cents)::BIGINT AS gross_cents,
  SUM(COALESCE(d.refunded_cents,0))::BIGINT AS refund_cents,
  SUM(COALESCE(d.stripe_fee_cents,0))::BIGINT AS stripe_fee_cents,
  SUM(COALESCE(d.platform_fee_cents,0))::BIGINT AS platform_fee_cents,
  SUM(COALESCE(d.net_to_organizer_cents,0))::BIGINT AS net_to_organizer_cents
FROM donations d
GROUP BY 1
ORDER BY 1 DESC;

-- Per-campaign ledger view
CREATE OR REPLACE VIEW vw_ledger_by_campaign AS
SELECT
  c.id AS campaign_id,
  c.title,
  c.slug,
  COUNT(d.id)::INT AS donations_count,
  SUM(d.amount_cents)::BIGINT AS gross_cents,
  SUM(COALESCE(d.refunded_cents,0))::BIGINT AS refund_cents,
  SUM(COALESCE(d.stripe_fee_cents,0))::BIGINT AS stripe_fee_cents,
  SUM(COALESCE(d.platform_fee_cents,0))::BIGINT AS platform_fee_cents,
  SUM(COALESCE(d.net_to_organizer_cents,0))::BIGINT AS net_to_organizer_cents
FROM campaigns c
LEFT JOIN donations d ON d.campaign_id = c.id
GROUP BY c.id, c.title, c.slug
ORDER BY gross_cents DESC NULLS LAST;

-- Helper RPC for fee backfill candidates
CREATE OR REPLACE FUNCTION select_donations_for_fee_backfill(p_since TIMESTAMPTZ, p_limit INT)
RETURNS TABLE (pi TEXT, campaign_id UUID, organizer_acct TEXT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT d.stripe_payment_intent_id AS pi,
         d.campaign_id,
         u.stripe_account_id AS organizer_acct
  FROM donations d
  JOIN campaigns c ON c.id = d.campaign_id
  JOIN users u ON u.id = c.organizer_id
  WHERE d.created_at >= p_since
    AND COALESCE(d.stripe_fee_cents,0) = 0
    AND d.stripe_payment_intent_id IS NOT NULL
    AND u.stripe_account_id IS NOT NULL
  ORDER BY d.created_at DESC
  LIMIT p_limit
$$;

-- Security: only service role can execute
REVOKE ALL ON FUNCTION select_donations_for_fee_backfill(TIMESTAMPTZ,INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION select_donations_for_fee_backfill(TIMESTAMPTZ,INT) TO service_role;