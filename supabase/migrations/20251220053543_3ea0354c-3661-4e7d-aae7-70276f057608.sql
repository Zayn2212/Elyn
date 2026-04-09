-- Fix the security definer view issue by using SECURITY INVOKER instead
DROP VIEW IF EXISTS public.user_sessions_secure;

-- Create a function to get sessions securely (excludes session_token)
CREATE OR REPLACE FUNCTION public.get_user_sessions_secure()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  ip_address inet,
  user_agent text,
  is_active boolean,
  last_activity_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    ip_address,
    user_agent,
    is_active,
    last_activity_at,
    created_at
  FROM public.user_sessions
  WHERE auth.uid() = user_sessions.user_id;
$$;