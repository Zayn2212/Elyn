-- Complete HIPAA Compliance: Add missing audit triggers
-- This ensures ALL PHI-related tables have full audit trails

-- 1. Add audit trigger for patient_summaries (contains PHI summaries)
DROP TRIGGER IF EXISTS audit_patient_summaries ON public.patient_summaries;
CREATE TRIGGER audit_patient_summaries
AFTER INSERT OR UPDATE OR DELETE ON public.patient_summaries
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 2. Add audit trigger for facilities (organization data)
DROP TRIGGER IF EXISTS audit_facilities ON public.facilities;
CREATE TRIGGER audit_facilities
AFTER INSERT OR UPDATE OR DELETE ON public.facilities
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 3. Add audit trigger for ai_generations (tracks AI access to PHI)
DROP TRIGGER IF EXISTS audit_ai_generations ON public.ai_generations;
CREATE TRIGGER audit_ai_generations
AFTER INSERT OR UPDATE OR DELETE ON public.ai_generations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 4. Add audit trigger for user_sessions (tracks access patterns)
DROP TRIGGER IF EXISTS audit_user_sessions ON public.user_sessions;
CREATE TRIGGER audit_user_sessions
AFTER INSERT OR UPDATE OR DELETE ON public.user_sessions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 5. Create a function to log PHI access (read operations)
-- This can be called from the application to log when PHI is viewed
CREATE OR REPLACE FUNCTION public.log_phi_access(
  p_table_name TEXT,
  p_record_id TEXT,
  p_access_type TEXT DEFAULT 'VIEW'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    new_data
  ) VALUES (
    auth.uid(),
    p_access_type,
    p_table_name,
    p_record_id,
    jsonb_build_object(
      'access_type', p_access_type,
      'accessed_at', NOW()
    )
  );
END;
$$;

-- 6. Add index for faster audit log queries by record
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);

-- 7. Add index for date range queries (compliance reporting)
CREATE INDEX IF NOT EXISTS idx_audit_logs_date_range ON public.audit_logs(created_at, table_name);

-- 8. Create a view for compliance reporting
DROP VIEW IF EXISTS public.phi_access_summary;
CREATE VIEW public.phi_access_summary AS
SELECT
  date_trunc('day', created_at) as access_date,
  table_name,
  action,
  COUNT(*) as access_count,
  COUNT(DISTINCT user_id) as unique_users
FROM public.audit_logs
WHERE table_name IN ('patients', 'clinical_notes', 'billing_records', 'bills', 'patient_summaries')
GROUP BY date_trunc('day', created_at), table_name, action
ORDER BY access_date DESC, table_name, action;

-- 9. Add comments for HIPAA documentation
COMMENT ON TABLE public.audit_logs IS 'HIPAA Compliance: Immutable audit trail for all PHI access and modifications. This table cannot be modified or deleted per 45 CFR 164.312(b).';

COMMENT ON FUNCTION public.log_phi_access IS 'HIPAA Compliance: Function to explicitly log PHI view/access events from the application layer.';
