-- App-owned users (NextAuth credentials). Replaces Supabase Auth FKs.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If older migrations pointed at auth.users, reattach to public.users (run on empty or migrated DBs).
alter table public.user_profiles drop constraint if exists user_profiles_user_id_fkey;
alter table public.meals drop constraint if exists meals_user_id_fkey;

alter table public.user_profiles
  add constraint user_profiles_user_id_fkey
  foreign key (user_id) references public.users (id) on delete cascade;

alter table public.meals
  add constraint meals_user_id_fkey
  foreign key (user_id) references public.users (id) on delete cascade;
