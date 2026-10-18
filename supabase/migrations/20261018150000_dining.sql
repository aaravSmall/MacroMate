-- Campus dining menus as a food source (first provider: Purdue Dining, docs/PURDUE_DINING.md).
--
-- Each provider item is ONE public food reused across days and locations; daily menus point at
-- it from dining_menu_items. Only the service role (the sync-dining Edge Function) writes.

alter type public.food_source add value if not exists 'dining_hall';

-- Provider identity and extra data on foods.
alter table public.foods
  add column provider            text,
  add column provider_item_id    text,
  add column provider_synced_at  timestamptz,
  add column allergens           text[] not null default '{}',
  add column diet_tags           text[] not null default '{}',
  add column ingredients         text,
  add constraint foods_provider_item_pair
    check ((provider is null) = (provider_item_id is null));

create unique index foods_provider_item
  on public.foods (provider, provider_item_id)
  where provider is not null;

comment on column public.foods.allergens is
  'Allergens the provider flags as present (lowercase, e.g. {gluten,soy}). For diet restrictions.';
comment on column public.foods.diet_tags is
  'Diet traits the provider flags (lowercase, e.g. {vegetarian,vegan}).';

-- Locations (dining courts, cafés).
create table public.dining_locations (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,
  external_id  text not null,
  name         text not null,
  formal_name  text,
  category     text,
  sort_order   integer not null default 0,
  updated_at   timestamptz not null default now(),
  unique (provider, external_id)
);

-- What a location serves on a date, by meal and station.
create table public.dining_menu_items (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.dining_locations (id) on delete cascade,
  served_on    date not null,
  meal         text not null,
  station      text not null,
  food_id      uuid not null references public.foods (id) on delete cascade,
  meal_order   integer not null default 0,
  sort_order   integer not null default 0,
  synced_at    timestamptz not null default now(),
  unique (location_id, served_on, meal, station, food_id)
);
create index dining_menu_items_food_idx on public.dining_menu_items (food_id);

-- Public, read-only. No write policies: only the service role (bypasses RLS) writes.
alter table public.dining_locations  enable row level security;
alter table public.dining_menu_items enable row level security;
create policy "dining locations: read" on public.dining_locations
  for select to anon, authenticated using (true);
create policy "dining menu items: read" on public.dining_menu_items
  for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.dining_locations, public.dining_menu_items
  from anon, authenticated;
grant select on public.dining_locations, public.dining_menu_items to anon, authenticated;

-- Insert or update a provider food by (provider, provider_item_id), with its servings, in one
-- transaction. Servings are matched by label and updated in place (never deleted), so log
-- entries keep their serving_id. Returns the food id. Nutrition changes reset label checks
-- through the existing foods trigger; past log entries keep their own snapshot.
create function public.upsert_provider_food(food jsonb, servings jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.foods;
  v_food_id uuid;
  s record;
  existing_serving uuid;
begin
  f := jsonb_populate_record(null::public.foods, food);
  if f.provider is null or f.provider_item_id is null then
    raise exception 'upsert_provider_food: provider and provider_item_id are required';
  end if;

  insert into public.foods (owner_id, visibility, source, external_id, barcode, name, brand,
                            base_amount, base_unit, calories, protein_g, carbs_g, fat_g,
                            fiber_g, sugar_g, sat_fat_g, sodium_mg, cholesterol_mg, micros,
                            provider, provider_item_id, provider_synced_at, allergens, diet_tags,
                            ingredients)
  values (null, 'public', f.source, f.external_id, null, f.name, f.brand,
          coalesce(f.base_amount, 1), coalesce(f.base_unit, 'serving'), f.calories,
          coalesce(f.protein_g, 0), coalesce(f.carbs_g, 0), coalesce(f.fat_g, 0),
          f.fiber_g, f.sugar_g, f.sat_fat_g, f.sodium_mg, f.cholesterol_mg,
          coalesce(f.micros, '{}'), f.provider, f.provider_item_id, now(),
          coalesce(f.allergens, '{}'), coalesce(f.diet_tags, '{}'), f.ingredients)
  on conflict (provider, provider_item_id) where provider is not null do update set
    name = excluded.name,
    brand = excluded.brand,
    base_amount = excluded.base_amount,
    base_unit = excluded.base_unit,
    calories = excluded.calories,
    protein_g = excluded.protein_g,
    carbs_g = excluded.carbs_g,
    fat_g = excluded.fat_g,
    fiber_g = excluded.fiber_g,
    sugar_g = excluded.sugar_g,
    sat_fat_g = excluded.sat_fat_g,
    sodium_mg = excluded.sodium_mg,
    cholesterol_mg = excluded.cholesterol_mg,
    micros = excluded.micros,
    allergens = excluded.allergens,
    diet_tags = excluded.diet_tags,
    ingredients = excluded.ingredients,
    provider_synced_at = now()
  returning id into v_food_id;

  for s in
    select x.label, x.base_multiplier, coalesce(x.is_default, false) as is_default
      from jsonb_to_recordset(coalesce(servings, '[]'::jsonb))
           as x(label text, base_multiplier numeric, is_default boolean)
  loop
    select id into existing_serving
      from public.food_servings fs
     where fs.food_id = v_food_id and fs.label = s.label
     limit 1;
    if existing_serving is null then
      if s.is_default then
        update public.food_servings set is_default = false
         where food_servings.food_id = v_food_id and is_default;
      end if;
      insert into public.food_servings (food_id, label, base_multiplier, is_default)
      values (v_food_id, s.label, s.base_multiplier, s.is_default);
    else
      if s.is_default then
        update public.food_servings set is_default = false
         where food_servings.food_id = v_food_id and is_default
           and id <> existing_serving;
      end if;
      update public.food_servings
         set base_multiplier = s.base_multiplier, is_default = s.is_default
       where id = existing_serving
         and (base_multiplier, is_default) is distinct from (s.base_multiplier, s.is_default);
    end if;
  end loop;

  return v_food_id;
end;
$$;

revoke execute on function public.upsert_provider_food(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_provider_food(jsonb, jsonb) to service_role;
