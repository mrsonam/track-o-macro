-- Meals and line items for Calorie Agent (RLS enabled)

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  raw_input text not null,
  total_kcal numeric not null default 0,
  total_protein_g numeric,
  total_carbs_g numeric,
  total_fat_g numeric,
  created_at timestamptz not null default now()
);

create index meals_user_id_created_at_idx on public.meals (user_id, created_at desc);

create table public.meal_line_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  label text not null,
  quantity numeric,
  unit text,
  kcal numeric not null,
  fdc_id bigint,
  source text not null check (source in ('fdc', 'estimate')),
  detail jsonb
);

create index meal_line_items_meal_id_idx on public.meal_line_items (meal_id);

alter table public.meals enable row level security;
alter table public.meal_line_items enable row level security;

create policy "Users select own meals"
  on public.meals for select
  using (auth.uid() = user_id);

create policy "Users insert own meals"
  on public.meals for insert
  with check (auth.uid() = user_id);

create policy "Users update own meals"
  on public.meals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own meals"
  on public.meals for delete
  using (auth.uid() = user_id);

create policy "Users select own line items"
  on public.meal_line_items for select
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

create policy "Users insert own line items"
  on public.meal_line_items for insert
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

create policy "Users update own line items"
  on public.meal_line_items for update
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

create policy "Users delete own line items"
  on public.meal_line_items for delete
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );
