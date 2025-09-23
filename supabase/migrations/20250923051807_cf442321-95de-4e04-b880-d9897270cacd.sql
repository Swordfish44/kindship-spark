-- Create the public_campaign_stats function as specified in the guide
CREATE OR REPLACE FUNCTION public_campaign_stats(sl text)
RETURNS TABLE (
    campaign_id uuid, 
    title text, 
    goal_cents bigint, 
    currency text, 
    raised_cents bigint, 
    status text
)
LANGUAGE sql 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
    SELECT 
        c.id as campaign_id,
        c.title,
        c.funding_goal_cents as goal_cents,
        'usd' as currency,
        COALESCE(SUM(d.amount_cents), 0)::bigint as raised_cents,
        c.status
    FROM campaigns c
    LEFT JOIN donations d ON d.campaign_id = c.id
    WHERE c.slug = sl AND c.status = 'active'
    GROUP BY c.id, c.title, c.funding_goal_cents, c.status
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION public_campaign_stats(text) FROM public;
GRANT EXECUTE ON FUNCTION public_campaign_stats(text) TO anon, authenticated;