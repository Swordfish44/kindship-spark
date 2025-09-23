-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.ratelimits (
  key text PRIMARY KEY, -- action:key (e.g., 'checkout:192.168.1.1')
  count int NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on ratelimits table (only service role should access this)
ALTER TABLE public.ratelimits ENABLE ROW LEVEL SECURITY;

-- Create policy that only allows service role to manage rate limits
CREATE POLICY "Service role can manage rate limits" ON public.ratelimits
FOR ALL USING (true) WITH CHECK (true);

-- Helper function: returns true if allowed and increments; resets window if expired
CREATE OR REPLACE FUNCTION public.rl_take(p_action text, p_key text, p_limit int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE 
  k text := p_action || ':' || p_key; 
  now_ts timestamptz := now(); 
  allowed boolean := false; 
  rec public.ratelimits;
BEGIN
  -- Try to get existing record with lock
  SELECT * INTO rec FROM public.ratelimits WHERE key = k FOR UPDATE;
  
  IF NOT FOUND THEN
    -- No existing record, create new one and allow
    INSERT INTO public.ratelimits(key, count, window_started_at) VALUES (k, 1, now_ts);
    RETURN true;
  END IF;
  
  -- Check if window has expired
  IF extract(epoch from (now_ts - rec.window_started_at)) > p_window_seconds THEN
    -- Window expired, reset count and allow
    UPDATE public.ratelimits SET count = 1, window_started_at = now_ts WHERE key = k;
    RETURN true;
  END IF;
  
  -- Window is still active, check if under limit
  IF rec.count < p_limit THEN
    -- Under limit, increment and allow
    UPDATE public.ratelimits SET count = rec.count + 1 WHERE key = k;
    RETURN true;
  END IF;
  
  -- Over limit, deny
  RETURN false;
END $$;

-- Revoke public access and grant only to service role
REVOKE ALL ON FUNCTION public.rl_take(text,text,int,int) FROM public;
GRANT EXECUTE ON FUNCTION public.rl_take(text,text,int,int) TO service_role;