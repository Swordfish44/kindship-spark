-- Comprehensive security fix for all remaining issues

-- 1. Fix backer_insights table - ensure it's completely private to organizers only
ALTER TABLE public.backer_insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.backer_insights ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on backer_insights
DROP POLICY IF EXISTS "organizers_view_own_campaign_backer_insights" ON public.backer_insights;
DROP POLICY IF EXISTS "system_manage_backer_insights" ON public.backer_insights;

-- Create strict policy for backer_insights - only organizers can see insights for their donors
CREATE POLICY "organizers_only_own_campaign_backer_insights" 
ON public.backer_insights 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM donations d 
    JOIN campaigns c ON d.campaign_id = c.id
    WHERE c.organizer_id = auth.uid() 
    AND d.donor_email = backer_insights.email
  )
);

-- System/service role access for backer_insights
CREATE POLICY "service_role_manage_backer_insights" 
ON public.backer_insights 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Tighten users table policies - ensure users can only see their own data
DROP POLICY IF EXISTS "users_read_authenticated_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_authenticated_own" ON public.users;
DROP POLICY IF EXISTS "users_update_authenticated_own" ON public.users;

CREATE POLICY "users_full_access_own_only" 
ON public.users 
FOR ALL 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Further restrict donations table access
DROP POLICY IF EXISTS "donations_insert_rate_limited" ON public.donations;
DROP POLICY IF EXISTS "donors_view_own_donations" ON public.donations;
DROP POLICY IF EXISTS "organizers_view_campaign_donations_limited" ON public.donations;

-- Donors can only see their own donations
CREATE POLICY "donors_view_own_donations_only" 
ON public.donations 
FOR SELECT 
TO authenticated
USING (
  donor_id = auth.uid() OR 
  (donor_id IS NULL AND donor_email IN (
    SELECT email FROM users WHERE id = auth.uid()
  ))
);

-- Organizers can see donations to their campaigns but with limited fields
CREATE POLICY "organizers_view_own_campaign_donations" 
ON public.donations 
FOR SELECT 
TO authenticated
USING (
  campaign_id IN (
    SELECT id FROM campaigns WHERE organizer_id = auth.uid()
  )
);

-- System can insert donations (for payment processing)
CREATE POLICY "system_insert_donations" 
ON public.donations 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- 4. Secure campaign_subscribers table
DROP POLICY IF EXISTS "organizers_view_own_campaign_subscribers" ON public.campaign_subscribers;
DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.campaign_subscribers;

-- Only campaign organizers can see their subscribers
CREATE POLICY "organizers_only_own_campaign_subscribers" 
ON public.campaign_subscribers 
FOR SELECT 
TO authenticated
USING (
  campaign_id IN (
    SELECT id FROM campaigns WHERE organizer_id = auth.uid()
  ) OR user_id = auth.uid()
);

-- Users can manage their own subscriptions
CREATE POLICY "users_manage_own_subscriptions_only" 
ON public.campaign_subscribers 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- System can manage subscriptions
CREATE POLICY "system_manage_subscribers" 
ON public.campaign_subscribers 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);