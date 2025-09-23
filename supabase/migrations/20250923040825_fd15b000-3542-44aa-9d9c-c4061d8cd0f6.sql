-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_comments ENABLE ROW LEVEL SECURITY;

-- USERS (organizer profiles): users can read/update their own profile
CREATE POLICY "users_read_own" ON public.users
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- CAMPAIGNS: public can read active campaigns, organizers manage their own
CREATE POLICY "campaigns_read_active_public" ON public.campaigns
FOR SELECT TO anon, authenticated
USING (status = 'active'::campaign_status);

CREATE POLICY "campaigns_read_own" ON public.campaigns
FOR SELECT TO authenticated
USING (organizer_id = auth.uid());

CREATE POLICY "campaigns_insert_own" ON public.campaigns
FOR INSERT TO authenticated
WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "campaigns_update_own" ON public.campaigns
FOR UPDATE TO authenticated
USING (organizer_id = auth.uid())
WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "campaigns_delete_own" ON public.campaigns
FOR DELETE TO authenticated
USING (organizer_id = auth.uid());

-- DONATIONS: organizers read campaign donations, donors read their own
CREATE POLICY "donations_read_campaign_organizer" ON public.donations
FOR SELECT TO authenticated
USING (
  campaign_id IN (
    SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
  )
);

CREATE POLICY "donations_read_own" ON public.donations
FOR SELECT TO authenticated
USING (donor_id = auth.uid());

-- Allow anonymous donations (payment processing)
CREATE POLICY "donations_insert_any" ON public.donations
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- PAYOUTS: organizers see their own
CREATE POLICY "payouts_read_own" ON public.payouts
FOR SELECT TO authenticated
USING (organizer_id = auth.uid());

-- DOCUMENTS: users manage their own documents
CREATE POLICY "documents_manage_own" ON public.documents
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- REWARD TIERS: public can read for active campaigns, organizers manage their own
CREATE POLICY "reward_tiers_read_active" ON public.reward_tiers
FOR SELECT TO anon, authenticated
USING (
  campaign_id IN (
    SELECT id FROM public.campaigns WHERE status = 'active'::campaign_status
  ) OR
  campaign_id IN (
    SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
  )
);

CREATE POLICY "reward_tiers_manage_own" ON public.reward_tiers
FOR ALL TO authenticated
USING (
  campaign_id IN (
    SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
  )
)
WITH CHECK (
  campaign_id IN (
    SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
  )
);

-- CAMPAIGN UPDATES: public reads public updates, organizers manage all their updates
CREATE POLICY "updates_read_public" ON public.campaign_updates
FOR SELECT TO anon, authenticated
USING (
  is_public = true OR
  campaign_id IN (
    SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
  )
);

CREATE POLICY "updates_manage_own" ON public.campaign_updates
FOR ALL TO authenticated
USING (
  campaign_id IN (
    SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
  )
)
WITH CHECK (
  campaign_id IN (
    SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
  )
);

-- CAMPAIGN COMMENTS: anyone reads non-deleted, authenticated users can create/update their own
CREATE POLICY "comments_read_active" ON public.campaign_comments
FOR SELECT TO anon, authenticated
USING (is_deleted = false);

CREATE POLICY "comments_insert_own" ON public.campaign_comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_deleted = false);

CREATE POLICY "comments_update_own" ON public.campaign_comments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Helpful indexes for performance
CREATE INDEX IF NOT EXISTS donations_campaign_id_created_at_idx ON public.donations (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaigns_organizer_id_status_idx ON public.campaigns (organizer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS payouts_organizer_id_created_at_idx ON public.payouts (organizer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_updates_campaign_id_idx ON public.campaign_updates (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_comments_campaign_id_idx ON public.campaign_comments (campaign_id, created_at DESC) WHERE is_deleted = false;