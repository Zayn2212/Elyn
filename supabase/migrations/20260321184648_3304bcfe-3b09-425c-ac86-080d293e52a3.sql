
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Providers can read their own flags
CREATE POLICY "Users can view own feature_flags"
  ON public.feature_flags FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- Admins can view all flags
CREATE POLICY "Admins can view all feature_flags"
  ON public.feature_flags FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert flags
CREATE POLICY "Admins can insert feature_flags"
  ON public.feature_flags FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update flags
CREATE POLICY "Admins can update feature_flags"
  ON public.feature_flags FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete flags
CREATE POLICY "Admins can delete feature_flags"
  ON public.feature_flags FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
