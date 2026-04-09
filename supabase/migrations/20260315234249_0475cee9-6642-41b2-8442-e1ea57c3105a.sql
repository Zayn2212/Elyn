
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS place_of_service_code text DEFAULT '21';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS facility_npi text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS taxonomy_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS place_of_service_default text DEFAULT '21';
