-- User profile & onboarding (Epic 1). RLS: users only see their own row.

create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  onboarding_completed_at timestamptz,
  onboarding_step integer not null default 0,
  draft jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_profiles_onboarding_completed_at_idx
  on public.user_profiles (onboarding_completed_at)
  where onboarding_completed_at is null;

alter table public.user_profiles enable row level security;

create policy "Users manage own profile"
  on public.user_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
