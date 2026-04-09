
-- Phase 1: Add missing patient demographics for CMS 1500 / 837P compliance
ALTER TABLE public.patients 
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS payer_id text;

-- Phase 2: Fee schedule table for CPT charge amounts
CREATE TABLE public.fee_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
  cpt_code text NOT NULL,
  charge_amount numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, facility_id, cpt_code)
);

ALTER TABLE public.fee_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fee_schedule" ON public.fee_schedule FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fee_schedule" ON public.fee_schedule FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fee_schedule" ON public.fee_schedule FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fee_schedule" ON public.fee_schedule FOR DELETE USING (auth.uid() = user_id);

-- Phase 3: Add group billing entity fields to facilities
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS billing_entity_name text,
  ADD COLUMN IF NOT EXISTS billing_entity_npi text,
  ADD COLUMN IF NOT EXISTS billing_entity_tax_id text;
