-- Add insurance information columns to patients table for claims submission
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS insurance_id text,
ADD COLUMN IF NOT EXISTS insurance_name text,
ADD COLUMN IF NOT EXISTS insurance_group text,
ADD COLUMN IF NOT EXISTS insurance_plan_type text,
ADD COLUMN IF NOT EXISTS subscriber_name text,
ADD COLUMN IF NOT EXISTS subscriber_relationship text;

-- Add comment for documentation
COMMENT ON COLUMN public.patients.insurance_id IS 'Member/Subscriber ID for claims';
COMMENT ON COLUMN public.patients.insurance_name IS 'Insurance company/payer name';
COMMENT ON COLUMN public.patients.insurance_group IS 'Employer group number';
COMMENT ON COLUMN public.patients.insurance_plan_type IS 'Medicare, Medicaid, Commercial, etc.';
COMMENT ON COLUMN public.patients.subscriber_name IS 'Primary subscriber name if different from patient';
COMMENT ON COLUMN public.patients.subscriber_relationship IS 'Self, Spouse, Child, Other';