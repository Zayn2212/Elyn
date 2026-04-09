-- Add status column to patients table for workflow tracking
ALTER TABLE public.patients 
ADD COLUMN status text NOT NULL DEFAULT 'not_seen' 
CHECK (status IN ('not_seen', 'in_progress', 'seen', 'signed'));