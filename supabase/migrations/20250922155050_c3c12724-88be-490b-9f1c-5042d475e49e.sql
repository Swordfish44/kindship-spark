-- Add campaign categories table (currently only in frontend)
CREATE TABLE public.campaign_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT, -- For lucide-react icons
  color_hex TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add reward tiers for backers (common crowdfunding feature)
CREATE TABLE public.reward_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  minimum_amount DECIMAL(10,2) NOT NULL,
  estimated_delivery DATE,
  quantity_limit INTEGER, -- NULL means unlimited
  quantity_claimed INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add campaign updates/news feed
CREATE TABLE public.campaign_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  update_type TEXT DEFAULT 'general' CHECK (update_type IN ('general', 'milestone', 'delay', 'completion')),
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add comments system for campaigns
CREATE TABLE public.campaign_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.campaign_comments(id) ON DELETE CASCADE, -- For replies
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add campaign analytics/metrics tracking
CREATE TABLE public.campaign_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  social_shares INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
  avg_donation_amount DECIMAL(10,2) DEFAULT 0,
  total_refunds DECIMAL(10,2) DEFAULT 0,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(campaign_id, recorded_date)
);

-- Add refunds tracking
CREATE TABLE public.refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donation_id UUID NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  stripe_refund_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add campaign team members/collaborators
CREATE TABLE public.campaign_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  permissions JSONB DEFAULT '{"can_edit": false, "can_withdraw": false, "can_manage_team": false}',
  invited_by UUID REFERENCES public.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

-- Link donations to reward tiers
ALTER TABLE public.donations 
ADD COLUMN reward_tier_id UUID REFERENCES public.reward_tiers(id) ON DELETE SET NULL;

-- Add category to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN category_id UUID REFERENCES public.campaign_categories(id) ON DELETE SET NULL;

-- Insert default categories
INSERT INTO public.campaign_categories (name, description, icon_name, color_hex) VALUES
('Technology', 'Innovative tech products and solutions', 'Zap', '#3B82F6'),
('Education', 'Educational projects and learning resources', 'BookOpen', '#10B981'),
('Environment', 'Environmental and sustainability projects', 'Leaf', '#22C55E'),
('Health', 'Healthcare and wellness initiatives', 'Heart', '#EF4444'),
('Arts & Culture', 'Creative arts, music, and cultural projects', 'Palette', '#8B5CF6'),
('Community', 'Local community and social impact projects', 'Users', '#F59E0B'),
('Sports', 'Sports and fitness related projects', 'Trophy', '#F97316'),
('Food & Dining', 'Culinary projects and food initiatives', 'ChefHat', '#84CC16');

-- Enable RLS on new tables
ALTER TABLE public.campaign_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_categories (public read)
CREATE POLICY "Anyone can view categories" ON public.campaign_categories
  FOR SELECT USING (true);

-- RLS Policies for reward_tiers
CREATE POLICY "Anyone can view reward tiers for active campaigns" ON public.reward_tiers
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE status = 'active'
    ) OR 
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "Campaign organizers can manage reward tiers" ON public.reward_tiers
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
    )
  );

-- RLS Policies for campaign_updates
CREATE POLICY "Anyone can view public campaign updates" ON public.campaign_updates
  FOR SELECT USING (
    is_public = true OR 
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "Campaign organizers can manage updates" ON public.campaign_updates
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
    )
  );

-- RLS Policies for campaign_comments
CREATE POLICY "Anyone can view campaign comments" ON public.campaign_comments
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "Authenticated users can create comments" ON public.campaign_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_deleted = false);

CREATE POLICY "Users can update their own comments" ON public.campaign_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for campaign_analytics
CREATE POLICY "Campaign organizers can view their analytics" ON public.campaign_analytics
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
    )
  );

-- RLS Policies for refunds
CREATE POLICY "Users can view their own refunds" ON public.refunds
  FOR SELECT USING (
    donation_id IN (
      SELECT id FROM public.donations WHERE donor_id = auth.uid()
    ) OR
    donation_id IN (
      SELECT d.id FROM public.donations d
      JOIN public.campaigns c ON d.campaign_id = c.id
      WHERE c.organizer_id = auth.uid()
    )
  );

-- RLS Policies for campaign_team_members
CREATE POLICY "Team members can view team" ON public.campaign_team_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_reward_tiers_campaign_id ON public.reward_tiers(campaign_id);
CREATE INDEX idx_campaign_updates_campaign_id ON public.campaign_updates(campaign_id);
CREATE INDEX idx_campaign_comments_campaign_id ON public.campaign_comments(campaign_id);
CREATE INDEX idx_campaign_comments_user_id ON public.campaign_comments(user_id);
CREATE INDEX idx_campaign_analytics_campaign_id ON public.campaign_analytics(campaign_id);
CREATE INDEX idx_refunds_donation_id ON public.refunds(donation_id);
CREATE INDEX idx_campaign_team_members_campaign_id ON public.campaign_team_members(campaign_id);
CREATE INDEX idx_campaigns_category_id ON public.campaigns(category_id);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_reward_tiers_updated_at
    BEFORE UPDATE ON public.reward_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_updates_updated_at
    BEFORE UPDATE ON public.campaign_updates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_comments_updated_at
    BEFORE UPDATE ON public.campaign_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();