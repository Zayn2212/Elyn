
ALTER TABLE billing_records 
ADD COLUMN encounter_type text,
ADD COLUMN is_telehealth boolean DEFAULT false,
ADD COLUMN place_of_service text DEFAULT '21',
ADD COLUMN referring_provider text,
ADD COLUMN referring_npi text,
ADD COLUMN applied_modifiers jsonb;

ALTER TABLE bills 
ADD COLUMN encounter_type text,
ADD COLUMN is_telehealth boolean DEFAULT false,
ADD COLUMN place_of_service text DEFAULT '21',
ADD COLUMN referring_provider text,
ADD COLUMN referring_npi text;
