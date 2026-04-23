create table if not exists pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  route text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table pilot_feedback enable row level security;

-- Users can only insert their own feedback
create policy "Users can insert own feedback"
  on pilot_feedback for insert
  with check (auth.uid() = user_id);

-- Admins can read all feedback
create policy "Admins can read feedback"
  on pilot_feedback for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
