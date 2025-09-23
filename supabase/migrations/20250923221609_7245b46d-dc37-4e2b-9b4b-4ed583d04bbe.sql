-- Advanced Analytics System for Campaign Performance

-- Update existing campaign_analytics to add more detailed tracking
ALTER TABLE public.campaign_analytics 
ADD COLUMN IF NOT EXISTS donations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_session_duration NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS bounce_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS traffic_sources JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS device_breakdown JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS geographic_data JSONB DEFAULT '{}'::jsonb;

-- Daily donation analytics
CREATE TABLE IF NOT EXISTS public.donation_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_donations_count INTEGER DEFAULT 0,
  total_amount_cents BIGINT DEFAULT 0,
  avg_donation_cents BIGINT DEFAULT 0,
  unique_donors_count INTEGER DEFAULT 0,
  repeat_donors_count INTEGER DEFAULT 0,
  anonymous_donations_count INTEGER DEFAULT 0,
  peak_donation_hour INTEGER,
  refunds_count INTEGER DEFAULT 0,
  refunds_amount_cents BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, recorded_date)
);

-- Backer insights and behavior tracking
CREATE TABLE IF NOT EXISTS public.backer_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  first_donation_date TIMESTAMP WITH TIME ZONE,
  total_donated_cents BIGINT DEFAULT 0,
  campaigns_supported INTEGER DEFAULT 0,
  avg_donation_cents BIGINT DEFAULT 0,
  last_donation_date TIMESTAMP WITH TIME ZONE,
  donation_frequency TEXT CHECK (donation_frequency IN ('one_time', 'occasional', 'regular', 'frequent')),
  preferred_categories JSONB DEFAULT '[]'::jsonb,
  geographic_location TEXT,
  engagement_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Campaign performance metrics (hourly tracking)
CREATE TABLE IF NOT EXISTS public.campaign_performance_hourly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  donations_count INTEGER DEFAULT 0,
  donations_amount_cents BIGINT DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  social_shares INTEGER DEFAULT 0,
  email_opens INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, recorded_at)
);

-- Enable RLS on new tables
ALTER TABLE public.donation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backer_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_performance_hourly ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics tables
CREATE POLICY "Campaign organizers can view donation analytics" ON public.donation_analytics
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "System can manage donation analytics" ON public.donation_analytics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Campaign organizers can view backer insights" ON public.backer_insights
  FOR SELECT USING (
    email IN (
      SELECT DISTINCT donor_email FROM donations 
      WHERE campaign_id IN (
        SELECT id FROM campaigns WHERE organizer_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage backer insights" ON public.backer_insights
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Campaign organizers can view performance data" ON public.campaign_performance_hourly
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "System can manage performance data" ON public.campaign_performance_hourly
  FOR ALL USING (true) WITH CHECK (true);

-- Function to calculate campaign analytics
CREATE OR REPLACE FUNCTION public.calculate_campaign_analytics(p_campaign_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  donation_stats RECORD;
  analytics_data RECORD;
BEGIN
  -- Calculate donation statistics for the day
  SELECT 
    COUNT(*) as donations_count,
    COALESCE(SUM(amount_cents), 0) as total_amount,
    COALESCE(AVG(amount_cents), 0) as avg_amount,
    COUNT(DISTINCT donor_email) as unique_donors,
    COUNT(*) FILTER (WHERE anonymous = true) as anonymous_count,
    COUNT(*) FILTER (WHERE donor_id IN (
      SELECT donor_id FROM donations 
      WHERE campaign_id = p_campaign_id 
      AND donor_id IS NOT NULL 
      GROUP BY donor_id 
      HAVING COUNT(*) > 1
    )) as repeat_donors
  INTO donation_stats
  FROM donations
  WHERE campaign_id = p_campaign_id
  AND DATE(created_at) = p_date;

  -- Upsert donation analytics
  INSERT INTO donation_analytics (
    campaign_id,
    recorded_date,
    total_donations_count,
    total_amount_cents,
    avg_donation_cents,
    unique_donors_count,
    repeat_donors_count,
    anonymous_donations_count
  ) VALUES (
    p_campaign_id,
    p_date,
    donation_stats.donations_count,
    donation_stats.total_amount,
    donation_stats.avg_amount,
    donation_stats.unique_donors,
    donation_stats.repeat_donors,
    donation_stats.anonymous_count
  )
  ON CONFLICT (campaign_id, recorded_date)
  DO UPDATE SET
    total_donations_count = EXCLUDED.total_donations_count,
    total_amount_cents = EXCLUDED.total_amount_cents,
    avg_donation_cents = EXCLUDED.avg_donation_cents,
    unique_donors_count = EXCLUDED.unique_donors_count,
    repeat_donors_count = EXCLUDED.repeat_donors_count,
    anonymous_donations_count = EXCLUDED.anonymous_donations_count;

  -- Update campaign analytics
  INSERT INTO campaign_analytics (
    campaign_id,
    recorded_date,
    avg_donation_amount,
    donations_count,
    conversion_rate
  ) VALUES (
    p_campaign_id,
    p_date,
    donation_stats.avg_amount / 100.0,
    donation_stats.donations_count,
    CASE 
      WHEN COALESCE((SELECT page_views FROM campaign_analytics WHERE campaign_id = p_campaign_id AND recorded_date = p_date), 0) > 0
      THEN (donation_stats.donations_count::NUMERIC / (SELECT page_views FROM campaign_analytics WHERE campaign_id = p_campaign_id AND recorded_date = p_date)) * 100
      ELSE 0
    END
  )
  ON CONFLICT (campaign_id, recorded_date)
  DO UPDATE SET
    avg_donation_amount = EXCLUDED.avg_donation_amount,
    donations_count = EXCLUDED.donations_count,
    conversion_rate = EXCLUDED.conversion_rate;
END;
$$;

-- Function to update backer insights
CREATE OR REPLACE FUNCTION public.update_backer_insights(p_donor_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  backer_stats RECORD;
  category_preferences JSONB;
BEGIN
  -- Calculate backer statistics
  SELECT 
    MIN(created_at) as first_donation,
    MAX(created_at) as last_donation,
    COALESCE(SUM(amount_cents), 0) as total_donated,
    COUNT(*) as total_donations,
    COUNT(DISTINCT campaign_id) as campaigns_supported,
    COALESCE(AVG(amount_cents), 0) as avg_donation,
    CASE 
      WHEN COUNT(*) = 1 THEN 'one_time'
      WHEN COUNT(*) <= 3 THEN 'occasional'
      WHEN COUNT(*) <= 10 THEN 'regular'
      ELSE 'frequent'
    END as frequency
  INTO backer_stats
  FROM donations
  WHERE donor_email = p_donor_email;

  -- Get preferred categories
  SELECT COALESCE(
    json_agg(DISTINCT cc.name) FILTER (WHERE cc.name IS NOT NULL),
    '[]'::json
  )::jsonb
  INTO category_preferences
  FROM donations d
  JOIN campaigns c ON d.campaign_id = c.id
  LEFT JOIN campaign_categories cc ON c.category_id = cc.id
  WHERE d.donor_email = p_donor_email;

  -- Upsert backer insights
  INSERT INTO backer_insights (
    email,
    user_id,
    first_donation_date,
    last_donation_date,
    total_donated_cents,
    campaigns_supported,
    avg_donation_cents,
    donation_frequency,
    preferred_categories,
    engagement_score
  ) VALUES (
    p_donor_email,
    (SELECT donor_id FROM donations WHERE donor_email = p_donor_email LIMIT 1),
    backer_stats.first_donation,
    backer_stats.last_donation,
    backer_stats.total_donated,
    backer_stats.campaigns_supported,
    backer_stats.avg_donation,
    backer_stats.frequency,
    category_preferences,
    -- Simple engagement score calculation
    LEAST((backer_stats.total_donations * 10 + backer_stats.campaigns_supported * 20 + 
           CASE backer_stats.frequency 
             WHEN 'frequent' THEN 50
             WHEN 'regular' THEN 30
             WHEN 'occasional' THEN 10
             ELSE 5
           END), 100)
  )
  ON CONFLICT (email)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    last_donation_date = EXCLUDED.last_donation_date,
    total_donated_cents = EXCLUDED.total_donated_cents,
    campaigns_supported = EXCLUDED.campaigns_supported,
    avg_donation_cents = EXCLUDED.avg_donation_cents,
    donation_frequency = EXCLUDED.donation_frequency,
    preferred_categories = EXCLUDED.preferred_categories,
    engagement_score = EXCLUDED.engagement_score,
    updated_at = now();
END;
$$;

-- Function to get campaign performance summary
CREATE OR REPLACE FUNCTION public.get_campaign_performance_summary(p_campaign_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_raised_cents BIGINT,
  total_donations INTEGER,
  unique_donors INTEGER,
  avg_donation_cents BIGINT,
  conversion_rate NUMERIC,
  page_views INTEGER,
  social_shares INTEGER,
  growth_rate NUMERIC,
  best_performing_day DATE,
  worst_performing_day DATE
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH daily_performance AS (
    SELECT 
      da.recorded_date,
      da.total_amount_cents,
      da.total_donations_count,
      ca.page_views,
      ca.social_shares,
      ca.conversion_rate
    FROM donation_analytics da
    LEFT JOIN campaign_analytics ca ON da.campaign_id = ca.campaign_id AND da.recorded_date = ca.recorded_date
    WHERE da.campaign_id = p_campaign_id
    AND da.recorded_date >= CURRENT_DATE - INTERVAL '1 day' * p_days
  ),
  performance_summary AS (
    SELECT 
      COALESCE(SUM(total_amount_cents), 0) as total_raised,
      COALESCE(SUM(total_donations_count), 0) as total_donations,
      COALESCE(SUM(page_views), 0) as total_page_views,
      COALESCE(SUM(social_shares), 0) as total_social_shares,
      COALESCE(AVG(conversion_rate), 0) as avg_conversion_rate
    FROM daily_performance
  ),
  donor_summary AS (
    SELECT 
      COUNT(DISTINCT donor_email) as unique_donors,
      COALESCE(AVG(amount_cents), 0) as avg_donation
    FROM donations 
    WHERE campaign_id = p_campaign_id
    AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
  ),
  growth_calc AS (
    SELECT 
      CASE 
        WHEN LAG(total_amount_cents) OVER (ORDER BY recorded_date) > 0
        THEN ((total_amount_cents - LAG(total_amount_cents) OVER (ORDER BY recorded_date))::NUMERIC / 
              LAG(total_amount_cents) OVER (ORDER BY recorded_date)) * 100
        ELSE 0
      END as daily_growth
    FROM daily_performance
    ORDER BY recorded_date DESC
    LIMIT 7
  ),
  best_worst_days AS (
    SELECT 
      (SELECT recorded_date FROM daily_performance ORDER BY total_amount_cents DESC LIMIT 1) as best_day,
      (SELECT recorded_date FROM daily_performance WHERE total_amount_cents > 0 ORDER BY total_amount_cents ASC LIMIT 1) as worst_day
  )
  SELECT 
    ps.total_raised::BIGINT,
    ps.total_donations::INTEGER,
    ds.unique_donors::INTEGER,
    ds.avg_donation::BIGINT,
    ps.avg_conversion_rate,
    ps.total_page_views::INTEGER,
    ps.total_social_shares::INTEGER,
    COALESCE(AVG(gc.daily_growth), 0) as growth_rate,
    bwd.best_day,
    bwd.worst_day
  FROM performance_summary ps
  CROSS JOIN donor_summary ds
  CROSS JOIN best_worst_days bwd
  LEFT JOIN growth_calc gc ON true
  GROUP BY ps.total_raised, ps.total_donations, ds.unique_donors, ds.avg_donation, 
           ps.avg_conversion_rate, ps.total_page_views, ps.total_social_shares, bwd.best_day, bwd.worst_day;
$$;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_donation_analytics_campaign_date ON public.donation_analytics(campaign_id, recorded_date);
CREATE INDEX IF NOT EXISTS idx_backer_insights_email ON public.backer_insights(email);
CREATE INDEX IF NOT EXISTS idx_backer_insights_engagement ON public.backer_insights(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_hourly_campaign_time ON public.campaign_performance_hourly(campaign_id, recorded_at);

-- Trigger to automatically update analytics when donations are created
CREATE OR REPLACE FUNCTION public.trigger_update_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update campaign analytics for the donation date
  PERFORM calculate_campaign_analytics(NEW.campaign_id, DATE(NEW.created_at));
  
  -- Update backer insights if donor email exists
  IF NEW.donor_email IS NOT NULL THEN
    PERFORM update_backer_insights(NEW.donor_email);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on donations table
DROP TRIGGER IF EXISTS update_analytics_on_donation ON public.donations;
CREATE TRIGGER update_analytics_on_donation
  AFTER INSERT OR UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_analytics();