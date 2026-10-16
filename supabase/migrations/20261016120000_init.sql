-- Initial schema for Tally.
-- See docs/SCHEMA.md for the ER diagram and conventions.
--
-- Conventions:
--   * uuid primary keys, created_at / updated_at on every table (updated_at kept by trigger)
--   * nutrition values are per serving; micronutrients live in a jsonb object keyed by
--     snake_case name + unit (e.g. "sodium_mg", "fiber_g")
--   * every user-owned table references auth.users ON DELETE CASCADE, so deleting the auth
--     user wipes all of their data
--   * RLS is enabled on every table

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.sex as enum ('female', 'male');

create type public.activity_level as enum (
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extra_active'
);

create type public.goal_type as enum ('lose', 'maintain', 'gain');

create type public.unit_system as enum ('imperial', 'metric');

create type public.food_source as enum ('open_food_facts', 'restaurant', 'user_shared', 'manual');

create type public.meal_label as enum ('breakfast', 'lunch', 'dinner', 'snack');

create type public.exercise_source as enum ('apple_health', 'manual');

create type public.weigh_in_frequency as enum ('weekly', 'biweekly', 'monthly');

create type public.weekday as enum (
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  sex public.sex,
  birth_date date,
  height_cm numeric(5, 1) check (height_cm > 0 and height_cm < 300),
  activity_level public.activity_level,
  goal_type public.goal_type,
  target_weight_kg numeric(5, 1) check (target_weight_kg > 0 and target_weight_kg < 700),
  weekly_rate_kg numeric(4, 2) check (weekly_rate_kg >= 0),
  daily_calorie_target integer check (daily_calorie_target > 0),
  protein_g integer check (protein_g >= 0),
  carbs_g integer check (carbs_g >= 0),
  fat_g integer check (fat_g >= 0),
  numbers_off_mode boolean not null default false,
  units public.unit_system not null default 'imperial',
  motivation text,
  dietary_restrictions text[] not null default '{}',
  allergies text[] not null default '{}',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.weekly_rate_kg is
  'Target rate of change per week (always >= 0); direction comes from goal_type.';

-- ---------------------------------------------------------------------------
-- foods (global database)
-- ---------------------------------------------------------------------------

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  brand text,
  restaurant text,
  source public.food_source not null,
  external_id text,
  serving_size numeric(8, 2) not null check (serving_size > 0),
  serving_unit text not null,
  serving_grams numeric(8, 2) check (serving_grams > 0),
  calories numeric(7, 1) not null check (calories >= 0),
  protein_g numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 1) not null default 0 check (fat_g >= 0),
  micronutrients jsonb not null default '{}' check (jsonb_typeof(micronutrients) = 'object'),
  barcode text,
  -- Kept (and anonymized) when the contributor deletes their account.
  contributed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create index foods_name_trgm_idx on public.foods using gin (name extensions.gin_trgm_ops);
create index foods_brand_trgm_idx on public.foods using gin (brand extensions.gin_trgm_ops);
create index foods_barcode_idx on public.foods (barcode) where barcode is not null;
create index foods_contributed_by_idx on public.foods (contributed_by)
  where contributed_by is not null;

-- ---------------------------------------------------------------------------
-- user_foods (private "My Foods")
-- ---------------------------------------------------------------------------

create table public.user_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  brand text,
  restaurant text,
  serving_size numeric(8, 2) not null check (serving_size > 0),
  serving_unit text not null,
  serving_grams numeric(8, 2) check (serving_grams > 0),
  calories numeric(7, 1) not null check (calories >= 0),
  protein_g numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 1) not null default 0 check (fat_g >= 0),
  micronutrients jsonb not null default '{}' check (jsonb_typeof(micronutrients) = 'object'),
  barcode text,
  is_shared boolean not null default false,
  shared_food_id uuid references public.foods (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_foods_user_id_idx on public.user_foods (user_id);
create index user_foods_name_trgm_idx on public.user_foods using gin (name extensions.gin_trgm_ops);
create index user_foods_shared_food_id_idx on public.user_foods (shared_food_id)
  where shared_food_id is not null;

-- ---------------------------------------------------------------------------
-- food_logs
-- ---------------------------------------------------------------------------

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_label public.meal_label not null,
  food_id uuid references public.foods (id) on delete set null,
  user_food_id uuid references public.user_foods (id) on delete set null,
  servings numeric(6, 2) not null check (servings > 0),
  -- Snapshot of the food at log time (per serving), so later edits to the food or its
  -- deletion never rewrite history.
  food_name text not null,
  food_brand text,
  serving_size numeric(8, 2) not null check (serving_size > 0),
  serving_unit text not null,
  calories numeric(7, 1) not null check (calories >= 0),
  protein_g numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 1) not null default 0 check (fat_g >= 0),
  micronutrients jsonb not null default '{}' check (jsonb_typeof(micronutrients) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- At most one source at any time. Exactly one is required on insert (trigger below);
  -- both may become null later if the source food is deleted, since the snapshot remains.
  constraint food_logs_single_source check (num_nonnulls(food_id, user_food_id) <= 1)
);

create index food_logs_user_logged_at_idx on public.food_logs (user_id, logged_at desc);
create index food_logs_food_id_idx on public.food_logs (food_id) where food_id is not null;
create index food_logs_user_food_id_idx on public.food_logs (user_food_id)
  where user_food_id is not null;

create function public.food_logs_require_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if num_nonnulls(new.food_id, new.user_food_id) <> 1 then
    raise exception 'food_logs: exactly one of food_id or user_food_id must be set'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger food_logs_require_source
  before insert on public.food_logs
  for each row execute function public.food_logs_require_source();

-- ---------------------------------------------------------------------------
-- exercise_entries
-- ---------------------------------------------------------------------------

create table public.exercise_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source public.exercise_source not null,
  external_id text,
  activity_type text not null,
  started_at timestamptz not null,
  duration_min numeric(6, 1) not null check (duration_min >= 0),
  calories_burned numeric(7, 1) not null check (calories_burned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create index exercise_entries_user_started_at_idx
  on public.exercise_entries (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- weigh_ins
-- ---------------------------------------------------------------------------

create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 700),
  body_fat_pct numeric(4, 1) check (body_fat_pct >= 0 and body_fat_pct <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index weigh_ins_user_measured_at_idx on public.weigh_ins (user_id, measured_at desc);

-- ---------------------------------------------------------------------------
-- user_settings (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weigh_in_frequency public.weigh_in_frequency not null default 'weekly',
  weigh_in_day public.weekday not null default 'sunday',
  weigh_in_time time not null default '08:00',
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger foods_set_updated_at before update on public.foods
  for each row execute function public.set_updated_at();
create trigger user_foods_set_updated_at before update on public.user_foods
  for each row execute function public.set_updated_at();
create trigger food_logs_set_updated_at before update on public.food_logs
  for each row execute function public.set_updated_at();
create trigger exercise_entries_set_updated_at before update on public.exercise_entries
  for each row execute function public.set_updated_at();
create trigger weigh_ins_set_updated_at before update on public.weigh_ins
  for each row execute function public.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New user bootstrap: create profile + settings rows on sign-up
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.user_foods enable row level security;
alter table public.food_logs enable row level security;
alter table public.exercise_entries enable row level security;
alter table public.weigh_ins enable row level security;
alter table public.user_settings enable row level security;

-- profiles: own row only. Rows are created by handle_new_user and removed by the
-- auth.users cascade, so there are no client insert/delete policies.
create policy "Users can read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- user_settings: same lifecycle as profiles.
create policy "Users can read their own settings" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can update their own settings" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- foods: readable by any signed-in user. Writes happen only through a future server
-- function using the service role, so there are deliberately no write policies.
create policy "Signed-in users can read foods" on public.foods
  for select to authenticated using (true);

-- user_foods: full CRUD on own rows.
create policy "Users can read their own foods" on public.user_foods
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own foods" on public.user_foods
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own foods" on public.user_foods
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own foods" on public.user_foods
  for delete to authenticated using ((select auth.uid()) = user_id);

-- food_logs: full CRUD on own rows; a referenced user_food must also be the user's own.
create policy "Users can read their own logs" on public.food_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own logs" on public.food_logs
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      user_food_id is null
      or exists (
        select 1 from public.user_foods uf
        where uf.id = user_food_id and uf.user_id = (select auth.uid())
      )
    )
  );
create policy "Users can update their own logs" on public.food_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      user_food_id is null
      or exists (
        select 1 from public.user_foods uf
        where uf.id = user_food_id and uf.user_id = (select auth.uid())
      )
    )
  );
create policy "Users can delete their own logs" on public.food_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- exercise_entries: full CRUD on own rows.
create policy "Users can read their own exercise" on public.exercise_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own exercise" on public.exercise_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own exercise" on public.exercise_entries
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own exercise" on public.exercise_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- weigh_ins: full CRUD on own rows.
create policy "Users can read their own weigh-ins" on public.weigh_ins
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own weigh-ins" on public.weigh_ins
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own weigh-ins" on public.weigh_ins
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own weigh-ins" on public.weigh_ins
  for delete to authenticated using ((select auth.uid()) = user_id);
