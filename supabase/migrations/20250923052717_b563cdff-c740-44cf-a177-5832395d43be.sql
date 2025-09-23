-- Create test data for donation system testing with proper UUIDs
-- First, we need a test user (this will create a user profile)
INSERT INTO users (id, email, full_name, organization_name, stripe_account_id, stripe_onboarding_complete)
VALUES (
  gen_random_uuid(), 
  'test@example.com', 
  'Test Organizer', 
  'Test Organization',
  'acct_test123',  -- This would be a real Stripe account ID in production
  true
);

-- Create a test campaign using the inserted user
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
) 
SELECT 
  gen_random_uuid(),
  'Test Crowdfunding Campaign',
  'This is a test campaign to verify our donation system is working correctly. You can safely donate to this campaign to test the Stripe integration.',
  'test-campaign',
  500000, -- $5,000 goal
  0,       -- $0 raised
  u.id,    -- Use the user ID from the users table
  'active',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop'
FROM users u WHERE u.email = 'test@example.com';