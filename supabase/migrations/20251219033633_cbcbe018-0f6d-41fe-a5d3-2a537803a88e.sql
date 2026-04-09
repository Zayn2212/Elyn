-- Create bills table for storing billing records
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  patient_mrn text,
  patient_dob date,
  date_of_service date NOT NULL,
  facility text,
  cpt_code text NOT NULL,
  cpt_description text,
  modifiers text[],
  diagnosis text,
  rvu numeric DEFAULT 0,
  status text DEFAULT 'pending',
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_bills_user_id ON public.bills(user_id);
CREATE INDEX idx_bills_date_of_service ON public.bills(date_of_service);
CREATE INDEX idx_bills_status ON public.bills(status);

-- Create trigger for updated_at
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Security definer function to get user specialty (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_specialty(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT specialty FROM public.profiles WHERE user_id = _user_id
$$;

-- 1. Users can view their own bills
CREATE POLICY "Users can view own bills"
ON public.bills
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Users can view bills from same specialty group
CREATE POLICY "Specialty group can view specialty bills"
ON public.bills
FOR SELECT
USING (
  public.get_user_specialty(auth.uid()) IS NOT NULL
  AND public.get_user_specialty(auth.uid()) = public.get_user_specialty(user_id)
);

-- 3. Admins can view all bills
CREATE POLICY "Admins can view all bills"
ON public.bills
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Users can insert their own bills
CREATE POLICY "Users can insert own bills"
ON public.bills
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Users can update their own bills
CREATE POLICY "Users can update own bills"
ON public.bills
FOR UPDATE
USING (auth.uid() = user_id);

-- 6. Admins can update all bills
CREATE POLICY "Admins can update all bills"
ON public.bills
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Users can delete their own bills
CREATE POLICY "Users can delete own bills"
ON public.bills
FOR DELETE
USING (auth.uid() = user_id);

-- 8. Admins can delete all bills
CREATE POLICY "Admins can delete all bills"
ON public.bills
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));