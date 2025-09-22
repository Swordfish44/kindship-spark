-- Add database functions for webhook operations

-- Function to increment campaign amount
CREATE OR REPLACE FUNCTION public.increment_campaign_amount(
  campaign_id_param UUID,
  amount_param DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.campaigns 
  SET current_amount = current_amount + amount_param,
      updated_at = NOW()
  WHERE id = campaign_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to increment reward tier claimed count
CREATE OR REPLACE FUNCTION public.increment_reward_tier_claimed(
  tier_id_param UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.reward_tiers 
  SET quantity_claimed = quantity_claimed + 1,
      updated_at = NOW()
  WHERE id = tier_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;