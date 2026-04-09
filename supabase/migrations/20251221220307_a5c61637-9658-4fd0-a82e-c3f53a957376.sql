-- Phase 1: AI Confidence Scores
-- Add AI confidence tracking to clinical_notes
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS ai_confidence JSONB;

-- AI generations audit trail for transparency
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES clinical_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  model_used TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  confidence_scores JSONB,
  alternative_codes JSONB,
  reasoning JSONB,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on ai_generations
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_generations" ON ai_generations 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_generations" ON ai_generations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Phase 2: Billing Validation & Denial Risk
-- Add validation tracking to billing_records
ALTER TABLE billing_records ADD COLUMN IF NOT EXISTS validation_status JSONB;
ALTER TABLE billing_records ADD COLUMN IF NOT EXISTS denial_risk_score NUMERIC;
ALTER TABLE billing_records ADD COLUMN IF NOT EXISTS denial_risk_factors JSONB;

-- Phase 3: Prior Visit Context
-- Patient summary cache for faster context loading
CREATE TABLE IF NOT EXISTS patient_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  summary TEXT,
  key_diagnoses JSONB,
  active_medications JSONB,
  last_notes_summary TEXT,
  note_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id, user_id)
);

-- Enable RLS on patient_summaries
ALTER TABLE patient_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patient_summaries" ON patient_summaries 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patient_summaries" ON patient_summaries 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patient_summaries" ON patient_summaries 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patient_summaries" ON patient_summaries 
  FOR DELETE USING (auth.uid() = user_id);