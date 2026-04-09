-- Add status and submitted_at columns to billing_records for tracking submission state
ALTER TABLE public.billing_records 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS facility text;

-- Add DELETE policy so physicians can delete their own billing records
CREATE POLICY "Users can delete own billing" 
ON public.billing_records 
FOR DELETE 
USING (auth.uid() = user_id);