-- Tell "no allergen data" apart from "no allergens listed".
--
-- foods.allergens: NULL = the source gave no allergen information; '{}' = it gave information
-- and flagged nothing; otherwise the flagged allergens. Until now the column was NOT NULL
-- DEFAULT '{}', so both cases looked the same.

alter table public.foods alter column allergens drop not null;
alter table public.foods alter column allergens set default null;

comment on column public.foods.allergens is
  'Allergens the source flags as present (lowercase, e.g. {gluten,soy}). NULL = no allergen data; {} = data given, none flagged. Only for warnings, never to call a food safe.';

-- Only provider foods (dining halls) carry allergen data; everything else had '{}' as a
-- placeholder, which now means "none listed", so make it NULL ("no data").
update public.foods set allergens = null where provider is null and allergens = '{}';

-- upsert_provider_food: keep NULL allergens as NULL (previously coalesced to '{}').
create or replace function public.upsert_provider_food(food jsonb, servings jsonb)
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
          f.allergens, coalesce(f.diet_tags, '{}'), f.ingredients)
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


