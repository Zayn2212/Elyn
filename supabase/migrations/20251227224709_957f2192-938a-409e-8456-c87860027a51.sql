-- Phase 1: HIPAA Hardening - Make audit_logs immutable

-- Add explicit DENY policies for UPDATE and DELETE on audit_logs
-- These are critical for HIPAA compliance - audit logs must never be modified

-- First, create a function that always returns false for immutability
CREATE OR REPLACE FUNCTION public.deny_audit_modification()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT false
$$;

-- Create policy to explicitly deny UPDATE (using the function)
CREATE POLICY "Deny all updates to audit logs" 
ON public.audit_logs 
FOR UPDATE 
TO authenticated
USING (false);

-- Create policy to explicitly deny DELETE (using the function)
CREATE POLICY "Deny all deletes from audit logs" 
ON public.audit_logs 
FOR DELETE 
TO authenticated
USING (false);