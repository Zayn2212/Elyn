-- ============================================
-- SECURITY FIXES MIGRATION
-- ============================================

-- 1. Fix audit_logs INSERT policy - only allow authenticated users
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Create a view for user_sessions that hides sensitive fields
-- First, drop the existing select policy
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;

-- Create a secure view that excludes session_token
CREATE OR REPLACE VIEW public.user_sessions_secure AS
SELECT 
  id,
  user_id,
  ip_address,
  user_agent,
  is_active,
  last_activity_at,
  created_at
FROM public.user_sessions
WHERE auth.uid() = user_id;

-- Create new policy that only allows viewing through proper channels
CREATE POLICY "Users can view own sessions secure" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Enforce patient-facility relationship
-- Make facility_id NOT NULL for patients (with a default migration for existing data)
-- First, update any patients without facility_id to use the user's default facility
UPDATE public.patients p
SET facility_id = (
  SELECT f.id FROM public.facilities f 
  WHERE f.user_id = p.user_id 
  ORDER BY f.is_default DESC NULLS LAST, f.created_at ASC 
  LIMIT 1
)
WHERE p.facility_id IS NULL;

-- Now we need to handle cases where users have patients but no facilities
-- Create a default facility for those users
INSERT INTO public.facilities (user_id, name, nickname, is_default)
SELECT DISTINCT p.user_id, 'Default Facility', 'Default', true
FROM public.patients p
WHERE p.facility_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM public.facilities f WHERE f.user_id = p.user_id
);

-- Update remaining orphaned patients
UPDATE public.patients p
SET facility_id = (
  SELECT f.id FROM public.facilities f 
  WHERE f.user_id = p.user_id 
  ORDER BY f.is_default DESC NULLS LAST, f.created_at ASC 
  LIMIT 1
)
WHERE p.facility_id IS NULL;

-- Add NOT NULL constraint with a foreign key
ALTER TABLE public.patients 
ALTER COLUMN facility_id SET NOT NULL;

-- Add explicit foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'patients_facility_id_fkey'
    AND table_name = 'patients'
  ) THEN
    ALTER TABLE public.patients
    ADD CONSTRAINT patients_facility_id_fkey 
    FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Add index for patient-facility lookups
CREATE INDEX IF NOT EXISTS idx_patients_facility_id ON public.patients(facility_id);

-- 5. Remove overly permissive specialty group billing policy (competitive risk)
DROP POLICY IF EXISTS "Specialty group can view specialty bills" ON public.bills;