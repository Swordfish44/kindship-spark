-- Fix users table RLS security issue
-- Remove duplicate policies that apply to unauthenticated users

-- Drop the problematic public role policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;  
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Keep only the secure authenticated policies
-- These are already present and properly restrict access:
-- - users_insert_own: Only authenticated users can insert with auth.uid() = id
-- - users_read_own: Only authenticated users can read with auth.uid() = id  
-- - users_update_own: Only authenticated users can update with auth.uid() = id

-- Verify RLS is enabled (it should already be)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;