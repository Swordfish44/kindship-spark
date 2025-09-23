-- Create public stats view for campaign progress (safe for anonymous access)
CREATE OR REPLACE VIEW campaign_public_stats AS
SELECT 
    c.id as campaign_id,
    c.slug,
    c.title,
    c.funding_goal_cents,
    c.status,
    COALESCE(SUM(d.amount_cents), 0)::bigint as raised_cents,
    COUNT(d.id)::int as backer_count
FROM campaigns c
LEFT JOIN donations d ON d.campaign_id = c.id
GROUP BY c.id, c.slug, c.title, c.funding_goal_cents, c.status;

-- Create security definer function to safely expose public campaign stats
CREATE OR REPLACE FUNCTION public_campaign_stats(sl text)
RETURNS TABLE (
    campaign_id uuid, 
    title text, 
    funding_goal_cents bigint, 
    raised_cents bigint, 
    backer_count int,
    status text
)
LANGUAGE sql 
SECURITY DEFINER 
STABLE AS $$
    SELECT 
        cps.campaign_id, 
        cps.title, 
        cps.funding_goal_cents, 
        cps.raised_cents, 
        cps.backer_count,
        cps.status
    FROM campaign_public_stats cps
    WHERE cps.slug = sl AND cps.status = 'active'
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION public_campaign_stats(text) FROM public;
GRANT EXECUTE ON FUNCTION public_campaign_stats(text) TO anon, authenticated;