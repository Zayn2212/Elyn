CREATE TABLE public.billing_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  encounter_date DATE NOT NULL,
  specialty TEXT,
  payer_type TEXT,
  cpt_codes TEXT[] NOT NULL,
  icd10_codes TEXT[] NOT NULL,
  modifiers TEXT[],
  em_level TEXT,
  encounter_type TEXT,
  ai_risk_score INTEGER,
  ai_reasoning TEXT,
  outcome TEXT DEFAULT 'pending',
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.billing_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own billing_outcomes" ON public.billing_outcomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own billing_outcomes" ON public.billing_outcomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own billing_outcomes" ON public.billing_outcomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all billing_outcomes" ON public.billing_outcomes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));