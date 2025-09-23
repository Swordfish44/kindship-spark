-- Convert all monetary columns to cents (bigint)
-- This ensures consistency throughout the system and avoids floating-point issues

-- Add new columns in cents
ALTER TABLE donations 
ADD COLUMN amount_cents BIGINT,
ADD COLUMN platform_fee_cents BIGINT,
ADD COLUMN net_amount_cents BIGINT;

ALTER TABLE campaigns
ADD COLUMN funding_goal_cents BIGINT,
ADD COLUMN current_amount_cents BIGINT DEFAULT 0;

ALTER TABLE reward_tiers
ADD COLUMN minimum_amount_cents BIGINT;

ALTER TABLE payouts
ADD COLUMN amount_cents BIGINT,
ADD COLUMN platform_fee_cents BIGINT;

-- Migrate existing data from decimal to cents
UPDATE donations SET 
  amount_cents = (amount * 100)::BIGINT,
  platform_fee_cents = (platform_fee * 100)::BIGINT,
  net_amount_cents = (net_amount * 100)::BIGINT
WHERE amount IS NOT NULL;

UPDATE campaigns SET 
  funding_goal_cents = (funding_goal * 100)::BIGINT,
  current_amount_cents = (current_amount * 100)::BIGINT
WHERE funding_goal IS NOT NULL;

UPDATE reward_tiers SET 
  minimum_amount_cents = (minimum_amount * 100)::BIGINT
WHERE minimum_amount IS NOT NULL;

UPDATE payouts SET 
  amount_cents = (amount * 100)::BIGINT,
  platform_fee_cents = (platform_fee * 100)::BIGINT
WHERE amount IS NOT NULL;

-- Create new functions that work with cents
CREATE OR REPLACE FUNCTION public.calculate_platform_fee_cents(amount_cents BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN ROUND(amount_cents * 0.08);
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_campaign_amount_cents(campaign_id_param UUID, amount_cents_param BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.campaigns 
  SET current_amount_cents = current_amount_cents + amount_cents_param,
      updated_at = NOW()
  WHERE id = campaign_id_param;
END;
$function$;