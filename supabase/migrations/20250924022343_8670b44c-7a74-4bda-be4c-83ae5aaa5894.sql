-- Fix remaining security warnings

-- 1. Update functions to have proper search_path (fixing Function Search Path Mutable warning)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 2. Fix Materialized View in API warning by dropping the problematic materialized view
-- This view exposes aggregated donation data without proper access controls
DROP MATERIALIZED VIEW IF EXISTS public.mv_donations_30d;

-- Drop the refresh function as well since it's no longer needed
DROP FUNCTION IF EXISTS public.refresh_mv_donations_30d();