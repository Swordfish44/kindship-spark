-- Email Management System

-- Email preferences for users
CREATE TABLE public.email_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('marketing', 'campaign_updates', 'donation_receipts', 'announcements')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, email_type)
);

-- Email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  subject_template TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('donation_receipt', 'organizer_notification', 'campaign_update', 'marketing', 'welcome')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email campaigns for marketing
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  target_audience JSONB NOT NULL DEFAULT '{"all_users": true}'::jsonb,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email sends tracking
CREATE TABLE public.email_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID,
  email_type TEXT NOT NULL,
  campaign_id UUID REFERENCES public.email_campaigns(id),
  template_id UUID REFERENCES public.email_templates(id),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed', 'opened', 'clicked')),
  external_id TEXT, -- Resend message ID
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign email subscribers
CREATE TABLE public.campaign_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  user_id UUID,
  email TEXT NOT NULL,
  subscription_type TEXT NOT NULL DEFAULT 'updates' CHECK (subscription_type IN ('updates', 'all')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(campaign_id, email)
);

-- Email unsubscribes
CREATE TABLE public.email_unsubscribes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID,
  email_type TEXT, -- null means unsubscribe from all
  unsubscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  UNIQUE(email, email_type)
);

-- Enable RLS
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Email preferences - users can manage their own
CREATE POLICY "Users can manage their email preferences" ON public.email_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Email templates - only admins can manage
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Anyone can view active templates" ON public.email_templates
  FOR SELECT USING (is_active = true);

-- Email campaigns - organizers can manage their own
CREATE POLICY "Campaign organizers can manage email campaigns" ON public.email_campaigns
  FOR ALL USING (
    created_by = auth.uid() OR 
    is_admin()
  ) WITH CHECK (
    created_by = auth.uid() OR 
    is_admin()
  );

-- Email sends - system can create, users can view their own
CREATE POLICY "System can create email sends" ON public.email_sends
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their email sends" ON public.email_sends
  FOR SELECT USING (
    recipient_user_id = auth.uid() OR
    is_admin()
  );

-- Campaign subscribers - users can manage their subscriptions
CREATE POLICY "Users can manage campaign subscriptions" ON public.campaign_subscribers
  FOR ALL USING (
    user_id = auth.uid() OR 
    campaign_id IN (
      SELECT id FROM campaigns WHERE organizer_id = auth.uid()
    ) OR
    is_admin()
  ) WITH CHECK (
    user_id = auth.uid() OR
    is_admin()
  );

CREATE POLICY "Campaign organizers can view subscribers" ON public.campaign_subscribers
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organizer_id = auth.uid()
    ) OR
    is_admin()
  );

-- Email unsubscribes - users can manage their own
CREATE POLICY "Users can manage unsubscribes" ON public.email_unsubscribes
  FOR ALL USING (
    user_id = auth.uid() OR
    is_admin()
  ) WITH CHECK (
    user_id = auth.uid() OR
    is_admin()
  );

-- Triggers for updated_at
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better performance
CREATE INDEX idx_email_preferences_user_id ON public.email_preferences(user_id);
CREATE INDEX idx_email_preferences_type ON public.email_preferences(email_type);
CREATE INDEX idx_email_sends_recipient ON public.email_sends(recipient_email);
CREATE INDEX idx_email_sends_status ON public.email_sends(status);
CREATE INDEX idx_email_sends_sent_at ON public.email_sends(sent_at);
CREATE INDEX idx_campaign_subscribers_campaign ON public.campaign_subscribers(campaign_id);
CREATE INDEX idx_email_unsubscribes_email ON public.email_unsubscribes(email);

-- Insert default email templates
INSERT INTO public.email_templates (name, subject_template, template_type) VALUES
  ('donation_receipt', 'Thank you for your donation to {{campaign_title}}', 'donation_receipt'),
  ('organizer_notification', 'New donation received for {{campaign_title}}', 'organizer_notification'),
  ('campaign_update', '{{campaign_title}} - {{update_title}}', 'campaign_update'),
  ('welcome_email', 'Welcome to our crowdfunding platform!', 'welcome'),
  ('marketing_newsletter', '{{subject}}', 'marketing');

-- Function to check if user has unsubscribed
CREATE OR REPLACE FUNCTION public.is_user_unsubscribed(email_address TEXT, email_type_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.email_unsubscribes 
    WHERE email = email_address 
    AND (email_type IS NULL OR email_type = email_type_check)
  );
END;
$$;