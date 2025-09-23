-- Create test data for donation system testing
-- First, we need a test user (this will create a user profile)
INSERT INTO users (id, email, full_name, organization_name, stripe_account_id, stripe_onboarding_complete)
VALUES (
  'test-organizer-123', 
  'test@example.com', 
  'Test Organizer', 
  'Test Organization',
  'acct_test123',  -- This would be a real Stripe account ID in production
  true
) ON CONFLICT (id) DO UPDATE SET
  stripe_account_id = 'acct_test123',
  stripe_onboarding_complete = true;

-- Create a test campaign
INSERT INTO campaigns (
  id,
  title,
  description,
  slug,
  funding_goal_cents,
  current_amount_cents,
  organizer_id,
  status,
  image_url
) VALUES (
  'test-campaign-123',
  'Test Crowdfunding Campaign',
  'This is a test campaign to verify our donation system is working correctly. You can safely donate to this campaign to test the Stripe integration.',
  'test-campaign',
  500000, -- $5,000 goal
  0,       -- $0 raised
  'test-organizer-123',
  'active',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop'
) ON CONFLICT (id) DO UPDATE SET
  status = 'active',
  funding_goal_cents = 500000,
  current_amount_cents = 0;