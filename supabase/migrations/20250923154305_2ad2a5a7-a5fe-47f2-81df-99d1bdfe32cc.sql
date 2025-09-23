-- Social Features Database Schema

-- User follows/following system
CREATE TABLE public.user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Campaign likes/favorites
CREATE TABLE public.campaign_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, campaign_id)
);

-- User activity feed
CREATE TABLE public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('campaign_created', 'campaign_backed', 'campaign_liked', 'user_followed')),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User achievements/badges
CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL CHECK (achievement_type IN ('first_campaign', 'first_donation', 'super_backer', 'campaign_creator', 'community_builder')),
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, achievement_type)
);

-- Social media accounts linking
CREATE TABLE public.user_social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('twitter', 'instagram', 'linkedin', 'facebook', 'website')),
    username TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Enable RLS on all tables
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_social_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_follows
CREATE POLICY "Users can view all follows" ON public.user_follows
    FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.user_follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" ON public.user_follows
    FOR DELETE USING (auth.uid() = follower_id);

-- RLS Policies for campaign_likes
CREATE POLICY "Users can view campaign likes" ON public.campaign_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like campaigns" ON public.campaign_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike campaigns" ON public.campaign_likes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_activities
CREATE POLICY "Users can view public activities" ON public.user_activities
    FOR SELECT USING (true);

CREATE POLICY "System can create activities" ON public.user_activities
    FOR INSERT WITH CHECK (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view achievements" ON public.user_achievements
    FOR SELECT USING (true);

CREATE POLICY "System can create achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (true);

-- RLS Policies for user_social_accounts
CREATE POLICY "Users can view public social accounts" ON public.user_social_accounts
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their social accounts" ON public.user_social_accounts
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX idx_campaign_likes_user ON public.campaign_likes(user_id);
CREATE INDEX idx_campaign_likes_campaign ON public.campaign_likes(campaign_id);
CREATE INDEX idx_user_activities_user ON public.user_activities(user_id);
CREATE INDEX idx_user_activities_created ON public.user_activities(created_at DESC);
CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX idx_user_social_accounts_user ON public.user_social_accounts(user_id);