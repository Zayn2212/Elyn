-- Create facilities table for multi-hospital support
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT,
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add facility_id to patients table
ALTER TABLE public.patients ADD COLUMN facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;

-- Enable RLS on facilities
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- RLS policies for facilities
CREATE POLICY "Users can view own facilities" 
ON public.facilities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own facilities" 
ON public.facilities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own facilities" 
ON public.facilities 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own facilities" 
ON public.facilities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_facilities_user_id ON public.facilities(user_id);
CREATE INDEX idx_patients_facility_id ON public.patients(facility_id);

-- Trigger for updated_at
CREATE TRIGGER update_facilities_updated_at
BEFORE UPDATE ON public.facilities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();