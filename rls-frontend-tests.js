// Frontend RLS Tests
// Run these in browser console while logged in as each user type

// === ORGANIZER A TESTS ===
console.log('=== TESTING AS ORGANIZER A ===');

// Test: Can see their own campaigns
const testOrganizerACampaigns = async () => {
  const { data, error } = await supabase.from('campaigns').select('*');
  console.log('Organizer A - My campaigns:', data?.length || 0, 'campaigns');
  console.log('Should only see campaigns I created:', data);
  if (error) console.error('Error:', error);
};

// Test: Can see donations to their campaigns
const testOrganizerADonations = async () => {
  const { data, error } = await supabase
    .from('donations')
    .select(`
      *,
      campaigns(title, organizer_id)
    `);
  console.log('Organizer A - Donations to my campaigns:', data?.length || 0, 'donations');
  console.log('Should only see donations to my campaigns:', data);
  if (error) console.error('Error:', error);
};

// Test: Can see reward tiers for their campaigns
const testOrganizerARewards = async () => {
  const { data, error } = await supabase.from('reward_tiers').select('*');
  console.log('Organizer A - My reward tiers:', data?.length || 0, 'tiers');
  if (error) console.error('Error:', error);
};

// === ORGANIZER B TESTS ===
console.log('=== TESTING AS ORGANIZER B ===');

const testOrganizerBCampaigns = async () => {
  const { data, error } = await supabase.from('campaigns').select('*');
  console.log('Organizer B - My campaigns:', data?.length || 0, 'campaigns');
  console.log('Should only see campaigns I created (different from A):', data);
  if (error) console.error('Error:', error);
};

const testOrganizerBDonations = async () => {
  const { data, error } = await supabase
    .from('donations')
    .select(`
      *,
      campaigns(title, organizer_id)
    `);
  console.log('Organizer B - Donations to my campaigns:', data?.length || 0, 'donations');
  console.log('Should only see donations to my campaigns:', data);
  if (error) console.error('Error:', error);
};

// === DONOR TESTS ===
console.log('=== TESTING AS DONOR ===');

const testDonorCampaigns = async () => {
  const { data, error } = await supabase.from('campaigns').select('*');
  console.log('Donor - Public campaigns:', data?.length || 0, 'campaigns');
  console.log('Should see all active campaigns (public view):', data);
  if (error) console.error('Error:', error);
};

const testDonorDonations = async () => {
  const { data, error } = await supabase
    .from('donations')
    .select(`
      *,
      campaigns(title)
    `);
  console.log('Donor - My donations:', data?.length || 0, 'donations');
  console.log('Should only see my own donations:', data);
  if (error) console.error('Error:', error);
};

const testDonorRewards = async () => {
  const { data, error } = await supabase.from('reward_tiers').select('*');
  console.log('Donor - Visible reward tiers:', data?.length || 0, 'tiers');
  console.log('Should see reward tiers for active campaigns:', data);
  if (error) console.error('Error:', error);
};

// === RUN ALL TESTS ===
const runRLSTests = async () => {
  console.log('🧪 Starting RLS Tests...');
  
  // Get current user to identify test scenario
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Testing as user:', user?.email);
  
  if (user?.email?.includes('organizer-a')) {
    console.log('🔍 Running Organizer A tests...');
    await testOrganizerACampaigns();
    await testOrganizerADonations();
    await testOrganizerARewards();
  } else if (user?.email?.includes('organizer-b')) {
    console.log('🔍 Running Organizer B tests...');
    await testOrganizerBCampaigns();
    await testOrganizerBDonations();
  } else if (user?.email?.includes('donor')) {
    console.log('🔍 Running Donor tests...');
    await testDonorCampaigns();
    await testDonorDonations();
    await testDonorRewards();
  }
  
  console.log('✅ RLS tests completed!');
};

// Usage: Call this function while logged in as each user type
// runRLSTests();

console.log('📋 RLS Test Functions Loaded!');
console.log('Usage: Call runRLSTests() while logged in as each user type');
console.log('Individual tests: testOrganizerACampaigns(), testDonorDonations(), etc.');