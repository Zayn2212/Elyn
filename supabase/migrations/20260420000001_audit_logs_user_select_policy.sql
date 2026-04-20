-- Allow authenticated users to view their own audit log entries.
-- The existing "Admins can view all audit logs" policy covers admin access.
-- This policy covers non-admin providers reading their own records.
CREATE POLICY "Users can view own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = user_id);
