-- Consolidated migration: covers all schema items that were missing from unapplied migrations.
-- Safe to run even if any of the previous migrations were partially applied (all guards included).

-- ─── 1. Radiology note_type enum values ───────────────────────────────────────
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'xray';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'ct';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'mri';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'ultrasound';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'mammography';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'fluoroscopy';

-- ─── 2. clinical_notes — radiology + review columns ───────────────────────────
ALTER TABLE public.clinical_notes
  ADD COLUMN IF NOT EXISTS modality            text,
  ADD COLUMN IF NOT EXISTS body_part           text,
  ADD COLUMN IF NOT EXISTS clinical_indication text,
  ADD COLUMN IF NOT EXISTS comparison_studies  text,
  ADD COLUMN IF NOT EXISTS technique           text,
  ADD COLUMN IF NOT EXISTS structured_category text,
  ADD COLUMN IF NOT EXISTS reviewed_at         timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by         uuid        DEFAULT NULL;

-- ─── 3. feature_flags table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature_key TEXT        NOT NULL,
  enabled     BOOLEAN     DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- ─── 4. patients — insurance + demographics columns ──────────────────────────
-- (from migrations 20260131090129 and 20260318080231)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS insurance_id              text,
  ADD COLUMN IF NOT EXISTS insurance_name            text,
  ADD COLUMN IF NOT EXISTS insurance_group           text,
  ADD COLUMN IF NOT EXISTS insurance_plan_type       text,
  ADD COLUMN IF NOT EXISTS subscriber_name           text,
  ADD COLUMN IF NOT EXISTS subscriber_relationship   text,
  ADD COLUMN IF NOT EXISTS sex                       text,
  ADD COLUMN IF NOT EXISTS address                   text,
  ADD COLUMN IF NOT EXISTS city                      text,
  ADD COLUMN IF NOT EXISTS state                     text,
  ADD COLUMN IF NOT EXISTS zip                       text,
  ADD COLUMN IF NOT EXISTS phone                     text,
  ADD COLUMN IF NOT EXISTS payer_id                  text;

-- ─── 5. profiles — billing fields ─────────────────────────────────────────────
-- (from migration 20260315234249)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tax_id                    text,
  ADD COLUMN IF NOT EXISTS taxonomy_code             text,
  ADD COLUMN IF NOT EXISTS billing_address           text,
  ADD COLUMN IF NOT EXISTS place_of_service_default  text DEFAULT '21';

-- ─── 6. facilities — billing + POS fields ─────────────────────────────────────
-- (from migrations 20260315234249 and 20260318080231)
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS place_of_service_code     text DEFAULT '21',
  ADD COLUMN IF NOT EXISTS tax_id                    text,
  ADD COLUMN IF NOT EXISTS facility_npi              text,
  ADD COLUMN IF NOT EXISTS billing_entity_name       text,
  ADD COLUMN IF NOT EXISTS billing_entity_npi        text,
  ADD COLUMN IF NOT EXISTS billing_entity_tax_id     text;

-- ─── 7. billing_outcomes table ───────────────────────────────────────────────
-- (from migration 20260321161701)
CREATE TABLE IF NOT EXISTS public.billing_outcomes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL,
  encounter_date date        NOT NULL,
  specialty      text,
  payer_type     text,
  cpt_codes      text[]      NOT NULL,
  icd10_codes    text[]      NOT NULL,
  modifiers      text[],
  em_level       text,
  encounter_type text,
  ai_risk_score  integer,
  ai_reasoning   text,
  outcome        text        DEFAULT 'pending',
  denial_reason  text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.billing_outcomes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_outcomes' AND policyname = 'Users can view own billing_outcomes') THEN
    CREATE POLICY "Users can view own billing_outcomes" ON public.billing_outcomes FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_outcomes' AND policyname = 'Users can insert own billing_outcomes') THEN
    CREATE POLICY "Users can insert own billing_outcomes" ON public.billing_outcomes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_outcomes' AND policyname = 'Users can update own billing_outcomes') THEN
    CREATE POLICY "Users can update own billing_outcomes" ON public.billing_outcomes FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_outcomes' AND policyname = 'Admins can view all billing_outcomes') THEN
    CREATE POLICY "Admins can view all billing_outcomes" ON public.billing_outcomes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ─── 8. fee_schedule table ────────────────────────────────────────────────────
-- (from migration 20260318080231)
CREATE TABLE IF NOT EXISTS public.fee_schedule (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL,
  facility_id    uuid        REFERENCES public.facilities(id) ON DELETE CASCADE,
  cpt_code       text        NOT NULL,
  charge_amount  numeric     NOT NULL DEFAULT 0,
  description    text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(user_id, facility_id, cpt_code)
);

ALTER TABLE public.fee_schedule ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fee_schedule' AND policyname = 'Users can view own fee_schedule') THEN
    CREATE POLICY "Users can view own fee_schedule" ON public.fee_schedule FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fee_schedule' AND policyname = 'Users can insert own fee_schedule') THEN
    CREATE POLICY "Users can insert own fee_schedule" ON public.fee_schedule FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fee_schedule' AND policyname = 'Users can update own fee_schedule') THEN
    CREATE POLICY "Users can update own fee_schedule" ON public.fee_schedule FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fee_schedule' AND policyname = 'Users can delete own fee_schedule') THEN
    CREATE POLICY "Users can delete own fee_schedule" ON public.fee_schedule FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── 8. feature_flags RLS policies (idempotent via DO block) ──────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feature_flags' AND policyname = 'Users can view own feature_flags'
  ) THEN
    CREATE POLICY "Users can view own feature_flags"
      ON public.feature_flags FOR SELECT TO public
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feature_flags' AND policyname = 'Admins can view all feature_flags'
  ) THEN
    CREATE POLICY "Admins can view all feature_flags"
      ON public.feature_flags FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feature_flags' AND policyname = 'Admins can insert feature_flags'
  ) THEN
    CREATE POLICY "Admins can insert feature_flags"
      ON public.feature_flags FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feature_flags' AND policyname = 'Admins can update feature_flags'
  ) THEN
    CREATE POLICY "Admins can update feature_flags"
      ON public.feature_flags FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feature_flags' AND policyname = 'Admins can delete feature_flags'
  ) THEN
    CREATE POLICY "Admins can delete feature_flags"
      ON public.feature_flags FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
