-- Create enum for campaign status
CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');

-- Create enum for document types
CREATE TYPE public.document_type AS ENUM ('government_id_front', 'government_id_back', 'proof_of_address', 'business_registration', 'bank_statement');

-- Create enum for payout status
CREATE TYPE public.payout_status AS ENUM ('pending', 'in_transit', 'paid', 'failed', 'cancelled');

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  organization_name TEXT,
  social_media_links JSONB DEFAULT '{}',
  stripe_account_id TEXT UNIQUE,
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  funding_goal DECIMAL(12,2) DEFAULT 0,
  current_amount DECIMAL(12,2) DEFAULT 0,
  status campaign_status DEFAULT 'draft',
  image_url TEXT,
  media_urls TEXT[] DEFAULT '{}',
  slug TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create donations table
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  donor_email TEXT,
  donor_name TEXT,
  anonymous BOOLEAN DEFAULT FALSE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create payouts table
CREATE TABLE public.payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  stripe_transfer_id TEXT UNIQUE,
  status payout_status DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, document_type)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for campaigns table
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
  FOR SELECT USING (status = 'active' OR organizer_id = auth.uid());

CREATE POLICY "Organizers can manage their campaigns" ON public.campaigns
  FOR ALL USING (organizer_id = auth.uid());

-- RLS Policies for donations table
CREATE POLICY "Donors can view their own donations" ON public.donations
  FOR SELECT USING (donor_id = auth.uid() OR donor_id IS NULL);

CREATE POLICY "Campaign organizers can view their campaign donations" ON public.donations
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organizer_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create donations" ON public.donations
  FOR INSERT WITH CHECK (true);

-- RLS Policies for payouts table
CREATE POLICY "Organizers can view their payouts" ON public.payouts
  FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "System can manage payouts" ON public.payouts
  FOR ALL USING (true);

-- RLS Policies for documents table
CREATE POLICY "Users can manage their own documents" ON public.documents
  FOR ALL USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_campaigns_organizer_id ON public.campaigns(organizer_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_slug ON public.campaigns(slug);
CREATE INDEX idx_donations_campaign_id ON public.donations(campaign_id);
CREATE INDEX idx_donations_donor_id ON public.donations(donor_id);
CREATE INDEX idx_donations_created_at ON public.donations(created_at DESC);
CREATE INDEX idx_payouts_organizer_id ON public.payouts(organizer_id);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate platform fee (8%)
CREATE OR REPLACE FUNCTION public.calculate_platform_fee(amount DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND(amount * 0.08, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique campaign slug
CREATE OR REPLACE FUNCTION public.generate_campaign_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 1;
BEGIN
    -- Convert title to slug format
    base_slug := LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
    base_slug := TRIM(both '-' FROM base_slug);
    
    -- Check if slug exists and add counter if needed
    final_slug := base_slug;
    WHILE EXISTS(SELECT 1 FROM public.campaigns WHERE slug = final_slug) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;