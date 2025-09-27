-- Create a simple test campaign without needing auth.users reference
-- First, let's check if we have any existing users and use one
DO $$
DECLARE
    existing_user_id UUID;
    test_campaign_id UUID;
BEGIN
    -- Try to find an existing user
    SELECT id INTO existing_user_id FROM public.users LIMIT 1;
    
    -- If no users exist, create a test record with a random UUID that won't conflict
    IF existing_user_id IS NULL THEN
        -- Create a user entry in our public users table only
        INSERT INTO public.users (id, email, full_name, organization_name)
        VALUES (
            '22222222-2222-2222-2222-222222222222',
            'test@example.com', 
            'Test Organizer', 
            'Test Organization'
        );
        existing_user_id := '22222222-2222-2222-2222-222222222222';
    END IF;
    
    -- Now create the campaign with the existing or new user
    INSERT INTO public.campaigns (
        slug, title, description, organizer_id, status, image_url,
        funding_goal_cents, current_amount_cents
    ) VALUES (
        'revolutionary-solar-panel-technology',
        'Revolutionary Solar Panel Technology',
        'Advancing high-efficiency solar panels to accelerate the clean energy transition.',
        existing_user_id,
        'active',
        '/social-fallback.jpg',
        5000000,   -- $50,000 goal
        125000     -- $1,250 raised
    ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        organizer_id = EXCLUDED.organizer_id,
        funding_goal_cents = EXCLUDED.funding_goal_cents,
        current_amount_cents = EXCLUDED.current_amount_cents;
        
    -- Get the campaign ID
    SELECT id INTO test_campaign_id FROM public.campaigns WHERE slug = 'revolutionary-solar-panel-technology';
    
    -- Add reward tiers
    INSERT INTO public.reward_tiers (
        campaign_id, title, description, minimum_amount, minimum_amount_cents,
        quantity_limit, quantity_claimed, is_active
    ) VALUES 
        (test_campaign_id, 'Early Supporter', 'Thank you email and project updates.', 25, 2500, 100, 5, true),
        (test_campaign_id, 'Champion Backer', 'Exclusive behind-the-scenes content and updates.', 50, 5000, 50, 3, true),
        (test_campaign_id, 'Premier Supporter', 'Personalized thank-you video and exclusive access.', 100, 10000, 25, 1, true)
    ON CONFLICT DO NOTHING;
    
END $$;