-- Fix security issues from previous migration

-- 1. Fix the public_campaign_stats function by adding search_path
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
STABLE 
SET search_path = public
AS $$
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

-- 2. Remove the problematic view and replace with a standard function approach
DROP VIEW IF EXISTS campaign_public_stats;

-- Create a simpler function instead of a view
CREATE OR REPLACE FUNCTION get_campaign_public_stats(campaign_slug text)
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
STABLE
SET search_path = public
AS $$
    SELECT 
        c.id as campaign_id,
        c.title,
        c.funding_goal_cents,
        COALESCE(SUM(d.amount_cents), 0)::bigint as raised_cents,
        COUNT(d.id)::int as backer_count,
        c.status
    FROM campaigns c
    LEFT JOIN donations d ON d.campaign_id = c.id
    WHERE c.slug = campaign_slug AND c.status = 'active'
    GROUP BY c.id, c.title, c.funding_goal_cents, c.status
$$;

-- Replace the old function with the new one
DROP FUNCTION IF EXISTS public_campaign_stats(text);

-- Grant permissions
REVOKE ALL ON FUNCTION get_campaign_public_stats(text) FROM public;
GRANT EXECUTE ON FUNCTION get_campaign_public_stats(text) TO anon, authenticated;