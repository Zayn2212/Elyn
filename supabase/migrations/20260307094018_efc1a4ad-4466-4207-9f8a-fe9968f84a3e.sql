
-- Add admin SELECT policies for billing_records, clinical_notes, and profiles
CREATE POLICY "Admins can view all billing_records"
  ON public.billing_records FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all clinical_notes"
  ON public.clinical_notes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
