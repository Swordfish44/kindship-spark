-- Fix remaining security issues with RLS policies

-- 1. Fix backer_insights table - restrict to organizers only for their campaign backers
DROP POLICY IF EXISTS "System can manage backer insights" ON public.backer_insights;
DROP POLICY IF EXISTS "organizers_view_campaign_backer_insights_aggregated" ON public.backer_insights;

CREATE POLICY "organizers_view_own_campaign_backer_insights" 
ON public.backer_insights 
FOR SELECT 
TO authenticated
USING (
  email IN (
    SELECT DISTINCT d.donor_email
    FROM donations d 
    JOIN campaigns c ON d.campaign_id = c.id
    WHERE c.organizer_id = auth.uid()
  )
);

CREATE POLICY "system_manage_backer_insights" 
ON public.backer_insights 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Fix user_activities table - restrict to user's own activities or public activities involving them
DROP POLICY IF EXISTS "System can create activities" ON public.user_activities;
DROP POLICY IF EXISTS "Users can view public activities" ON public.user_activities;

CREATE POLICY "users_view_own_activities" 
ON public.user_activities 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR 
  target_user_id = auth.uid() OR
  (activity_type IN ('campaign_created', 'campaign_funded') AND campaign_id IN (
    SELECT id FROM campaigns WHERE status = 'active'
  ))
);

CREATE POLICY "system_create_activities" 
ON public.user_activities 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- 3. Fix user_social_accounts table - only show public social accounts, users can manage their own
DROP POLICY IF EXISTS "Users can manage their social accounts" ON public.user_social_accounts;
DROP POLICY IF EXISTS "Users can view public social accounts" ON public.user_social_accounts;

CREATE POLICY "users_manage_own_social_accounts" 
ON public.user_social_accounts 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "public_view_social_accounts_for_active_users" 
ON public.user_social_accounts 
FOR SELECT 
TO authenticated
USING (
  user_id IN (
    SELECT organizer_id FROM campaigns WHERE status = 'active'
    UNION
    SELECT user_id FROM user_activities WHERE activity_type IN ('campaign_created', 'donation_made')
  )
);

-- 4. Fix user_follows table - only users involved in the relationship can see it
DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
DROP POLICY IF EXISTS "Users can unfollow others" ON public.user_follows;
DROP POLICY IF EXISTS "Users can view all follows" ON public.user_follows;

CREATE POLICY "users_manage_own_follows" 
ON public.user_follows 
FOR INSERT 
TO authenticated
WITH CHECK (follower_id = auth.uid());

CREATE POLICY "users_remove_own_follows" 
ON public.user_follows 
FOR DELETE 
TO authenticated
USING (follower_id = auth.uid());

CREATE POLICY "users_view_relevant_follows" 
ON public.user_follows 
FOR SELECT 
TO authenticated
USING (
  follower_id = auth.uid() OR 
  following_id = auth.uid()
);