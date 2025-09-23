-- Update public_campaign_stats to include backer count
CREATE OR REPLACE FUNCTION public_campaign_stats(sl text)
RETURNS TABLE (
    campaign_id uuid, 
    title text, 
    goal_cents bigint, 
    currency text, 
    raised_cents bigint, 
    backer_count bigint,
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
        COUNT(d.id)::bigint as backer_count,
        c.status
    FROM campaigns c
    LEFT JOIN donations d ON d.campaign_id = c.id
    WHERE c.slug = sl AND c.status = 'active'
    GROUP BY c.id, c.title, c.funding_goal_cents, c.status
$$;