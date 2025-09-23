-- RLS Testing Queries
-- Replace the UUIDs with real auth user IDs after creating them

-- STEP 1: Insert user profiles (run in SQL editor)
INSERT INTO users (id, email, full_name) VALUES 
('REPLACE-WITH-ORGANIZER-A-UUID', 'organizer-a@test.com', 'Organizer A'),
('REPLACE-WITH-ORGANIZER-B-UUID', 'organizer-b@test.com', 'Organizer B'),
('REPLACE-WITH-DONOR-UUID', 'donor@test.com', 'Test Donor');

-- STEP 2: Create test campaigns
INSERT INTO campaigns (title, description, organizer_id, status, funding_goal_cents, current_amount_cents, slug) VALUES 
('Save the Whales', 'Organizer A campaign', 'REPLACE-WITH-ORGANIZER-A-UUID', 'active', 100000, 25000, 'save-whales'),
('Clean the Ocean', 'Organizer B campaign', 'REPLACE-WITH-ORGANIZER-B-UUID', 'active', 200000, 50000, 'clean-ocean');

-- STEP 3: Create test donations (get campaign IDs from step 2 results)
INSERT INTO donations (campaign_id, donor_id, amount_cents, platform_fee_cents, net_amount_cents, donor_email, donor_name, anonymous) VALUES 
('CAMPAIGN-A-ID', 'REPLACE-WITH-DONOR-UUID', 2500, 200, 2300, 'donor@test.com', 'Test Donor', false),
('CAMPAIGN-B-ID', 'REPLACE-WITH-DONOR-UUID', 5000, 400, 4600, 'donor@test.com', 'Test Donor', false),
('CAMPAIGN-A-ID', NULL, 1000, 80, 920, 'anonymous@test.com', 'Anonymous', true);

-- STEP 4: RLS Test Queries
-- Run these while logged in as each user type

-- === TEST AS ORGANIZER A ===
-- Should see: Only their campaign and its donations
SELECT 'My Campaigns' as test, c.title, c.organizer_id 
FROM campaigns c;

SELECT 'Donations to My Campaigns' as test, d.amount_cents, d.donor_name, c.title as campaign
FROM donations d 
JOIN campaigns c ON d.campaign_id = c.id;

-- === TEST AS ORGANIZER B ===
-- Should see: Only their campaign and its donations (different from A)
SELECT 'My Campaigns' as test, c.title, c.organizer_id 
FROM campaigns c;

SELECT 'Donations to My Campaigns' as test, d.amount_cents, d.donor_name, c.title as campaign
FROM donations d 
JOIN campaigns c ON d.campaign_id = c.id;

-- === TEST AS DONOR ===
-- Should see: All active campaigns (public), only their own donations
SELECT 'Public Campaigns' as test, c.title, c.organizer_id
FROM campaigns c;

SELECT 'My Donations' as test, d.amount_cents, d.donor_name, c.title as campaign
FROM donations d 
JOIN campaigns c ON d.campaign_id = c.id;

-- EXPECTED RESULTS:
-- Organizer A: 1 campaign (theirs), 2 donations (to their campaign)
-- Organizer B: 1 campaign (theirs), 1 donation (to their campaign) 
-- Donor: 2 campaigns (both public), 2 donations (only theirs)