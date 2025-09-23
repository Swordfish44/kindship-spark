-- Add kyc_status field to users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';

-- Add helpful index for stripe_account_id lookups
CREATE INDEX IF NOT EXISTS users_stripe_account_id_idx ON public.users (stripe_account_id) WHERE stripe_account_id IS NOT NULL;