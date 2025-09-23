-- Create public campaign discovery function with search, sort, and pagination
create or replace function public_discover_campaigns(
  p_search text default null,
  p_sort   text default 'recent', -- 'recent' | 'most_raised' | 'progress'
  p_page   int  default 1,
  p_size   int  default 20
)
returns table (
  slug text,
  title text,
  description text,
  funding_goal_cents bigint,
  currency text,
  raised_cents bigint,
  created_at timestamptz,
  image_url text
)
language sql
security definer
as $$
  with agg as (
    select c.id,
           c.slug,
           c.title,
           c.description,
           c.funding_goal_cents,
           'usd' as currency,
           c.created_at,
           c.image_url,
           coalesce(sum(d.amount_cents),0)::bigint as raised_cents,
           case when coalesce(c.funding_goal_cents,0) > 0 then (coalesce(sum(d.amount_cents),0)::numeric / nullif(c.funding_goal_cents,0)) else 0 end as progress_ratio
    from campaigns c
    left join donations d on d.campaign_id = c.id
    where c.status = 'active'
      and (
        p_search is null
        or c.title ilike '%'||p_search||'%'
        or c.description ilike '%'||p_search||'%'
      )
    group by c.id, c.slug, c.title, c.description, c.funding_goal_cents, c.created_at, c.image_url
  )
  select a.slug, a.title, a.description, a.funding_goal_cents, a.currency, a.raised_cents, a.created_at, a.image_url
  from agg a
  order by
    case when p_sort = 'most_raised' then a.raised_cents end desc nulls last,
    case when p_sort = 'progress'    then a.progress_ratio end desc nulls last,
    case when p_sort = 'recent'      then a.created_at end desc nulls last,
    a.created_at desc
  limit greatest(1, least(p_size, 100))
  offset greatest(0, (p_page-1)) * greatest(1, least(p_size, 100));
$$;

-- Grant permissions
revoke all on function public_discover_campaigns(text,text,int,int) from public;
grant execute on function public_discover_campaigns(text,text,int,int) to anon, authenticated;