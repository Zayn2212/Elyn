-- Add radiology types to note_type enum
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'xray';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'ct';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'mri';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'ultrasound';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'mammography';
ALTER TYPE note_type ADD VALUE IF NOT EXISTS 'fluoroscopy';

-- Add radiology-specific columns to clinical_notes
ALTER TABLE public.clinical_notes
ADD COLUMN IF NOT EXISTS modality text,
ADD COLUMN IF NOT EXISTS body_part text,
ADD COLUMN IF NOT EXISTS clinical_indication text,
ADD COLUMN IF NOT EXISTS comparison_studies text,
ADD COLUMN IF NOT EXISTS technique text,
ADD COLUMN IF NOT EXISTS structured_category text;