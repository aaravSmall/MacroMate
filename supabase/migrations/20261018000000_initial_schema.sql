-- Enums
create type public.activity_level   as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');
create type public.unit_system      as enum ('imperial', 'metric');
create type public.sex_for_bmr      as enum ('male', 'female');
create type public.weigh_in_freq    as enum ('weekly', 'biweekly', 'monthly');
create type public.goal_type        as enum ('lose', 'maintain', 'gain');
create type public.food_visibility  as enum ('private', 'public');
create type public.food_source      as enum ('open_food_facts', 'restaurant', 'label_scan', 'user_product', 'user_recipe');
create type public.base_unit        as enum ('g', 'ml', 'serving');
create type public.meal_type        as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.exercise_source  as enum ('apple_health', 'manual');

-- profiles
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  display_name            text,
  birth_date              date,
  sex                     public.sex_for_bmr,
  height_cm               numeric(5,1) check (height_cm > 0),
  activity_level          public.activity_level,
  unit_system             public.unit_system not null default 'imperial',
  timezone                text not null default 'America/New_York',
  motivation              text,
  dietary_restrictions    text[] not null default '{}',
  allergies               text[] not null default '{}',
  numbers_off             boolean not null default false,
  weigh_in_frequency      public.weigh_in_freq not null default 'weekly',
  weigh_in_weekday        smallint not null default 0 check (weigh_in_weekday between 0 and 6),
  weigh_in_reminder_time  time not null default '08:00',
  onboarded_at            timestamptz,
  created_at              timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- goals
create table public.goals (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  goal_type             public.goal_type not null,
  start_weight_kg       numeric(5,2) not null check (start_weight_kg > 0),
  target_weight_kg      numeric(5,2) check (target_weight_kg > 0),
  target_body_fat_pct   numeric(4,1) check (target_body_fat_pct between 0 and 100),
  pace_kg_per_week      numeric(4,2) not null default 0,
  daily_calorie_target  integer not null check (daily_calorie_target > 0),
  protein_target_g      integer check (protein_target_g >= 0),
  carbs_target_g        integer check (carbs_target_g >= 0),
  fat_target_g          integer check (fat_target_g >= 0),
  started_at            timestamptz not null default now(),
  ended_at              timestamptz,
  created_at            timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create unique index goals_one_active_per_user on public.goals (user_id) where ended_at is null;

-- foods
create table public.foods (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references auth.users (id) on delete set null,
  visibility          public.food_visibility not null default 'private',
  source              public.food_source not null,
  external_id         text,
  barcode             text,
  name                text not null check (length(trim(name)) > 0),
  brand               text,
  base_amount         numeric(8,2) not null default 100 check (base_amount > 0),
  base_unit           public.base_unit not null default 'g',
  calories            numeric(7,2) not null check (calories >= 0),
  protein_g           numeric(7,2) not null default 0 check (protein_g >= 0),
  carbs_g             numeric(7,2) not null default 0 check (carbs_g >= 0),
  fat_g               numeric(7,2) not null default 0 check (fat_g >= 0),
  fiber_g             numeric(7,2) check (fiber_g >= 0),
  sugar_g             numeric(7,2) check (sugar_g >= 0),
  sat_fat_g           numeric(7,2) check (sat_fat_g >= 0),
  sodium_mg           numeric(8,2) check (sodium_mg >= 0),
  cholesterol_mg      numeric(8,2) check (cholesterol_mg >= 0),
  micros              jsonb not null default '{}',
  verification_count  integer not null default 0,
  mismatch_count      integer not null default 0,
  search_vector       tsvector generated always as (
                        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(brand, ''))
                      ) stored,
  created_at          timestamptz not null default now(),
  check (source not in ('user_product', 'user_recipe', 'label_scan') or owner_id is not null or visibility = 'public')
);
create unique index foods_source_external_id on public.foods (source, external_id) where external_id is not null;
create index foods_search_idx on public.foods using gin (search_vector);
create index foods_owner_idx  on public.foods (owner_id);
create index foods_barcode_idx on public.foods (barcode) where barcode is not null;

-- food_servings
create table public.food_servings (
  id               uuid primary key default gen_random_uuid(),
  food_id          uuid not null references public.foods (id) on delete cascade,
  label            text not null,
  base_multiplier  numeric(10,4) not null check (base_multiplier > 0),
  is_default       boolean not null default false,
  created_at       timestamptz not null default now()
);
create index food_servings_food_idx on public.food_servings (food_id);
create unique index food_servings_one_default on public.food_servings (food_id) where is_default;

-- food_verifications
create table public.food_verifications (
  food_id      uuid not null references public.foods (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  matches      boolean not null,
  verified_at  timestamptz not null default now(),
  primary key (food_id, user_id)
);
create index food_verifications_user_idx on public.food_verifications (user_id);

create function public.sync_verification_counts()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  target uuid := coalesce(new.food_id, old.food_id);
begin
  update public.foods f
     set verification_count = (select count(*) from public.food_verifications v where v.food_id = target and v.matches),
         mismatch_count     = (select count(*) from public.food_verifications v where v.food_id = target and not v.matches)
   where f.id = target;
  return null;
end;
$$;
create trigger food_verifications_counts
  after insert or update or delete on public.food_verifications
  for each row execute function public.sync_verification_counts();

create function public.reset_verifications_on_edit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (new.base_amount, new.base_unit, new.calories, new.protein_g, new.carbs_g, new.fat_g,
      new.fiber_g, new.sugar_g, new.sat_fat_g, new.sodium_mg, new.cholesterol_mg, new.micros)
     is distinct from
     (old.base_amount, old.base_unit, old.calories, old.protein_g, old.carbs_g, old.fat_g,
      old.fiber_g, old.sugar_g, old.sat_fat_g, old.sodium_mg, old.cholesterol_mg, old.micros)
  then
    delete from public.food_verifications where food_id = new.id;
  end if;
  return null;
end;
$$;
create trigger foods_reset_verifications
  after update on public.foods
  for each row execute function public.reset_verifications_on_edit();

-- log_entries
create table public.log_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  food_id     uuid references public.foods (id) on delete set null,
  serving_id  uuid references public.food_servings (id) on delete set null,
  quantity    numeric(7,2) not null default 1 check (quantity > 0),
  logged_at   timestamptz not null default now(),
  local_date  date not null,
  meal        public.meal_type not null,
  food_name   text not null,
  calories    numeric(7,2) not null check (calories >= 0),
  protein_g   numeric(7,2) not null default 0,
  carbs_g     numeric(7,2) not null default 0,
  fat_g       numeric(7,2) not null default 0,
  nutrients   jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index log_entries_user_date on public.log_entries (user_id, local_date);

-- exercise_entries
create table public.exercise_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  source           public.exercise_source not null default 'apple_health',
  external_id      text,
  activity_type    text not null,
  started_at       timestamptz not null,
  ended_at         timestamptz not null,
  local_date       date not null,
  active_calories  numeric(7,2) not null check (active_calories >= 0),
  created_at       timestamptz not null default now(),
  check (ended_at >= started_at),
  unique (user_id, external_id)
);
create index exercise_entries_user_date on public.exercise_entries (user_id, local_date);

-- weigh_ins
create table public.weigh_ins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  measured_at   timestamptz not null default now(),
  local_date    date not null,
  weight_kg     numeric(5,2) not null check (weight_kg > 0),
  body_fat_pct  numeric(4,1) check (body_fat_pct between 0 and 100),
  created_at    timestamptz not null default now()
);
create index weigh_ins_user_date on public.weigh_ins (user_id, local_date);

-- daily_totals
create view public.daily_totals
with (security_invoker = true) as
select user_id, local_date, count(*) as entry_count, sum(calories) as calories,
       sum(protein_g) as protein_g, sum(carbs_g) as carbs_g, sum(fat_g) as fat_g
from public.log_entries
group by user_id, local_date;

-- account deletion: private foods go, public foods stay
create function public.delete_private_foods()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.foods where owner_id = old.id and visibility = 'private';
  return old;
end;
$$;
create trigger on_auth_user_deleted
  before delete on auth.users
  for each row execute function public.delete_private_foods();

-- RLS
alter table public.profiles           enable row level security;
alter table public.goals              enable row level security;
alter table public.foods              enable row level security;
alter table public.food_servings      enable row level security;
alter table public.food_verifications enable row level security;
alter table public.log_entries        enable row level security;
alter table public.exercise_entries   enable row level security;
alter table public.weigh_ins          enable row level security;

create policy "own profile: read"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own goals"     on public.goals            for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own log"       on public.log_entries      for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own exercise"  on public.exercise_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own weigh-ins" on public.weigh_ins        for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "foods: read public or own" on public.foods for select to authenticated
  using (visibility = 'public' or owner_id = (select auth.uid()));
create policy "foods: create own" on public.foods for insert to authenticated
  with check (owner_id = (select auth.uid()) and source in ('user_product', 'user_recipe', 'label_scan'));
create policy "foods: edit own recipes" on public.foods for update to authenticated
  using (owner_id = (select auth.uid()) and source = 'user_recipe')
  with check (owner_id = (select auth.uid()) and source = 'user_recipe');
create policy "foods: delete own private" on public.foods for delete to authenticated
  using (owner_id = (select auth.uid()) and visibility = 'private');

revoke insert, update on public.foods from anon, authenticated;
grant insert (owner_id, visibility, source, external_id, barcode, name, brand, base_amount, base_unit,
              calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sat_fat_g, sodium_mg,
              cholesterol_mg, micros)
  on public.foods to authenticated;
grant update (visibility, name, brand, base_amount, base_unit, calories, protein_g, carbs_g, fat_g,
              fiber_g, sugar_g, sat_fat_g, sodium_mg, cholesterol_mg, micros)
  on public.foods to authenticated;

create policy "servings: read" on public.food_servings for select to authenticated
  using (exists (select 1 from public.foods f
                  where f.id = food_id and (f.visibility = 'public' or f.owner_id = (select auth.uid()))));
create policy "servings: add to own food" on public.food_servings for insert to authenticated
  with check (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = (select auth.uid())));
create policy "servings: edit own private or recipe" on public.food_servings for update to authenticated
  using (exists (select 1 from public.foods f
                  where f.id = food_id and f.owner_id = (select auth.uid())
                    and (f.visibility = 'private' or f.source = 'user_recipe')))
  with check (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = (select auth.uid())));
create policy "servings: delete own private or recipe" on public.food_servings for delete to authenticated
  using (exists (select 1 from public.foods f
                  where f.id = food_id and f.owner_id = (select auth.uid())
                    and (f.visibility = 'private' or f.source = 'user_recipe')));

create policy "verifications: read" on public.food_verifications for select to authenticated using (true);
create policy "verifications: verify others' public foods" on public.food_verifications for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.foods f
                           where f.id = food_id and f.visibility = 'public'
                             and f.owner_id is distinct from (select auth.uid())));
create policy "verifications: change own answer" on public.food_verifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "verifications: remove own" on public.food_verifications for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.daily_totals to authenticated;

-- profile for the account that already exists
insert into public.profiles (id) select id from auth.users on conflict do nothing;
