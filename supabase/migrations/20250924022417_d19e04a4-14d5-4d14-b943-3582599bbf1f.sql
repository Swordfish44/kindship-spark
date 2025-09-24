-- Fix the final Function Search Path Mutable warning
-- Update select_donations_for_fee_backfill function to have proper search_path

CREATE OR REPLACE FUNCTION public.select_donations_for_fee_backfill(p_since timestamp with time zone, p_limit integer)
RETURNS TABLE(pi text, campaign_id uuid, organizer_acct text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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