-- Update the public_discover_campaigns function to support category filtering and enhanced features (fixed)
CREATE OR REPLACE FUNCTION public.public_discover_campaigns(
  p_search text DEFAULT NULL,
  p_sort text DEFAULT 'recent',
  p_page integer DEFAULT 1,
  p_size integer DEFAULT 20,
  p_category_id uuid DEFAULT NULL,
  p_min_goal_cents bigint DEFAULT NULL,
  p_max_goal_cents bigint DEFAULT NULL,
  p_funding_status text DEFAULT NULL
)
RETURNS TABLE(
  slug text,
  title text,
  description text,
  funding_goal_cents bigint,
  currency text,
  raised_cents bigint,
  created_at timestamp with time zone,
  image_url text,
  category_name text,
  category_color text,
  backer_count bigint,
  progress_percentage numeric,
  organizer_name text,
  days_remaining integer
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with agg as (
    select c.id,
           c.slug,
           c.title,
           c.description,
           c.funding_goal_cents,
           'usd' as currency,
           c.created_at,
           c.image_url,
           cc.name as category_name,
           cc.color_hex as category_color,
           u.full_name as organizer_name,
           coalesce(sum(d.amount_cents),0)::bigint as raised_cents,
           count(d.id)::bigint as backer_count,
           case 
             when coalesce(c.funding_goal_cents,0) > 0 
             then (coalesce(sum(d.amount_cents),0)::numeric / nullif(c.funding_goal_cents,0)) * 100 
             else 0 
           end as progress_percentage,
           30 as days_remaining -- Placeholder for now
    from campaigns c
    left join donations d on d.campaign_id = c.id
    left join campaign_categories cc on c.category_id = cc.id
    left join users u on c.organizer_id = u.id
    where c.status = 'active'
      and (p_search is null or c.title ilike '%'||p_search||'%' or c.description ilike '%'||p_search||'%')
      and (p_category_id is null or c.category_id = p_category_id)
      and (p_min_goal_cents is null or c.funding_goal_cents >= p_min_goal_cents)
      and (p_max_goal_cents is null or c.funding_goal_cents <= p_max_goal_cents)
    group by c.id, c.slug, c.title, c.description, c.funding_goal_cents, c.created_at, c.image_url, 
             cc.name, cc.color_hex, u.full_name
    having (p_funding_status is null or 
            (p_funding_status = 'new' and coalesce(sum(d.amount_cents),0) = 0) or
            (p_funding_status = 'funded' and coalesce(sum(d.amount_cents),0) >= c.funding_goal_cents) or
            (p_funding_status = 'active' and coalesce(sum(d.amount_cents),0) > 0 and coalesce(sum(d.amount_cents),0) < c.funding_goal_cents))
  )
  select 
    a.slug, 
    a.title, 
    a.description, 
    a.funding_goal_cents, 
    a.currency, 
    a.raised_cents, 
    a.created_at, 
    a.image_url,
    a.category_name,
    a.category_color,
    a.backer_count,
    a.progress_percentage,
    a.organizer_name,
    a.days_remaining
  from agg a
  order by
    case when p_sort = 'most_raised' then a.raised_cents end desc nulls last,
    case when p_sort = 'progress' then a.progress_percentage end desc nulls last,
    case when p_sort = 'goal_amount' then a.funding_goal_cents end desc nulls last,
    case when p_sort = 'recent' then a.created_at end desc nulls last,
    a.created_at desc
  limit greatest(1, least(p_size, 100))
  offset greatest(0, (p_page-1)) * greatest(1, least(p_size, 100));
$function$