-- Add 'discharged' to the patients status check constraint

-- Drop the existing constraint
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_status_check;

-- Add the new constraint with 'discharged' included
ALTER TABLE patients ADD CONSTRAINT patients_status_check
CHECK (status IN ('not_seen', 'in_progress', 'seen', 'signed', 'discharged'));
