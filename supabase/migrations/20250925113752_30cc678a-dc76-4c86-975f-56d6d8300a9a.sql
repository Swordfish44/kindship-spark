-- Secure backer_insights access and expose masked insights via RPC

-- 1) Enable RLS and restrict direct SELECT to admins only
ALTER TABLE public.backer_insights ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'backer_insights' AND policyname = 'Only admins can select backer_insights'
  ) THEN
    CREATE POLICY "Only admins can select backer_insights"
    ON public.backer_insights
    FOR SELECT
    TO public
    USING (public.is_admin());
  END IF;
END $$;

-- 2) Helper to mask emails
CREATE OR REPLACE FUNCTION public.mask_email(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  name_part text;
  domain_part text;
  masked_name text;
BEGIN
  IF p_email IS NULL THEN RETURN NULL; END IF;
  name_part := split_part(p_email, '@', 1);
  domain_part := split_part(p_email, '@', 2);
  IF length(name_part) <= 2 THEN
    masked_name := left(name_part, 1) || '***';
  ELSE
    masked_name := left(name_part, 2) || '***' || right(name_part, 1);
  END IF;
  RETURN masked_name || '@' || domain_part;
END;
$$;

-- 3) Secure RPC to fetch top insights with masked emails
CREATE OR REPLACE FUNCTION public.get_backer_insights_masked(p_emails text[], p_limit integer DEFAULT 10)
RETURNS TABLE(
  masked_email text,
  total_donated_cents bigint,
  campaigns_supported integer,
  donation_frequency text,
  engagement_score integer,
  preferred_categories text[],
  first_donation_date timestamptz,
  last_donation_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_sensitive_data_access('select_masked','backer_insights', NULL);
  RETURN QUERY
  SELECT
    public.mask_email(bi.email) as masked_email,
    bi.total_donated_cents,
    bi.campaigns_supported,
    bi.donation_frequency,
    bi.engagement_score,
    ARRAY(SELECT jsonb_array_elements_text(bi.preferred_categories)) as preferred_categories,
    bi.first_donation_date,
    bi.last_donation_date
  FROM public.backer_insights bi
  WHERE bi.email = ANY(p_emails)
  ORDER BY bi.engagement_score DESC NULLS LAST
  LIMIT COALESCE(p_limit, 10);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_backer_insights_masked(text[], integer) TO anon, authenticated;