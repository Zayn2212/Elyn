-- Add acuity columns to patients table
alter table patients
  add column if not exists acuity_level text,
  add column if not exists acuity_score integer,
  add column if not exists acuity_signals jsonb;

-- Create acuity_feedback table for physician override logging
create table if not exists acuity_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  computed_score integer not null default 0,
  computed_level text not null default 'low',
  physician_override text not null,
  override_reason text,
  patient_context jsonb,
  created_at timestamptz not null default now()
);

alter table acuity_feedback enable row level security;

-- Physicians can insert their own overrides
create policy "Users can insert own acuity feedback"
  on acuity_feedback for insert
  with check (auth.uid() = user_id);

-- Users can read their own feedback
create policy "Users can read own acuity feedback"
  on acuity_feedback for select
  using (auth.uid() = user_id);

-- Admins can read all feedback
create policy "Admins can read all acuity feedback"
  on acuity_feedback for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
