-- Add missing columns to clinical_notes for note status workflow
ALTER TABLE clinical_notes 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_by uuid;

-- Fix patients_status_check to include 'discharged'
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_status_check;
ALTER TABLE patients ADD CONSTRAINT patients_status_check 
  CHECK (status IN ('not_seen', 'in_progress', 'seen', 'signed', 'discharged'));

-- Enable realtime for billing tables
ALTER PUBLICATION supabase_realtime ADD TABLE billing_records;
ALTER PUBLICATION supabase_realtime ADD TABLE bills;