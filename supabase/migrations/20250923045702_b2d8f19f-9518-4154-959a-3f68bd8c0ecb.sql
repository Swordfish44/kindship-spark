-- RLS Testing Setup Script
-- This creates sample data to test RLS policies with three user types

-- Step 1: Create sample users (you'll need to replace these UUIDs with real auth user IDs)
-- For testing, create 3 users in Supabase Auth dashboard first, then replace these UUIDs

-- Sample UUIDs - REPLACE WITH REAL USER IDs FROM AUTH
-- Organizer A: 11111111-1111-1111-1111-111111111111  
-- Organizer B: 22222222-2222-2222-2222-222222222222
-- Random Donor: 33333333-3333-3333-3333-333333333333

-- Step 2: Insert user profiles
INSERT INTO users (id, email, full_name) VALUES 
('11111111-1111-1111-1111-111111111111', 'organizer-a@test.com', 'Organizer A'),
('22222222-2222-2222-2222-222222222222', 'organizer-b@test.com', 'Organizer B'),
('33333333-3333-3333-3333-333333333333', 'donor@test.com', 'Test Donor')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create test campaigns
INSERT INTO campaigns (id, title, description, organizer_id, status, funding_goal_cents, current_amount_cents) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Save the Whales', 'Organizer A campaign', '11111111-1111-1111-1111-111111111111', 'active', 100000, 25000),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Clean the Ocean', 'Organizer B campaign', '22222222-2222-2222-2222-222222222222', 'active', 200000, 50000)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create test donations
INSERT INTO donations (id, campaign_id, donor_id, amount_cents, platform_fee_cents, net_amount_cents, donor_email, donor_name, anonymous) VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 2500, 200, 2300, 'donor@test.com', 'Test Donor', false),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 5000, 400, 4600, 'donor@test.com', 'Test Donor', false),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 1000, 80, 920, 'anonymous@test.com', 'Anonymous', true)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Create test reward tiers
INSERT INTO reward_tiers (id, campaign_id, title, description, minimum_amount_cents) VALUES 
('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Thank You Card', 'Digital thank you', 1000),
('ssssssss-ssss-ssss-ssss-ssssssssssss', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sticker Pack', 'Cool stickers', 2500)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Create test campaign updates
INSERT INTO campaign_updates (id, campaign_id, title, content, is_public) VALUES 
('uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Progress Update', 'We are making great progress!', true),
('vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Private Update', 'Internal team update', false)
ON CONFLICT (id) DO NOTHING;