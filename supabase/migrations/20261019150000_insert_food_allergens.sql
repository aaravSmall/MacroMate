-- insert_food_with_servings: also store `allergens`, so Open Food Facts products cached by
-- cache-off-food keep their allergen tags (for the allergy badge in search). A food JSON without
-- the key stores NULL ("no allergen data"), as before.
create or replace function public.insert_food_with_servings(food jsonb, servings jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  f public.foods;
begin
  f := jsonb_populate_record(null::public.foods, food);

  insert into public.foods (owner_id, visibility, source, external_id, barcode, name, brand,
                            base_amount, base_unit, calories, protein_g, carbs_g, fat_g,
                            fiber_g, sugar_g, sat_fat_g, sodium_mg, cholesterol_mg, micros,
                            allergens)
  values (f.owner_id, coalesce(f.visibility, 'private'), f.source, f.external_id, f.barcode,
          f.name, f.brand, coalesce(f.base_amount, 100), coalesce(f.base_unit, 'g'), f.calories,
          coalesce(f.protein_g, 0), coalesce(f.carbs_g, 0), coalesce(f.fat_g, 0), f.fiber_g,
          f.sugar_g, f.sat_fat_g, f.sodium_mg, f.cholesterol_mg, coalesce(f.micros, '{}'),
          f.allergens)
  on conflict (source, external_id) where external_id is not null do nothing
  returning id into new_id;

  if new_id is null then
    -- Lost the race (or already cached): the winner inserted the servings in its transaction.
    select id into new_id
      from public.foods
     where source = f.source and external_id = f.external_id;
    return new_id;
  end if;

  insert into public.food_servings (food_id, label, base_multiplier, is_default)
  select new_id, s.label, s.base_multiplier, coalesce(s.is_default, false)
    from jsonb_to_recordset(coalesce(servings, '[]'::jsonb))
         as s(label text, base_multiplier numeric, is_default boolean);

  return new_id;
end;
$$;

revoke execute on function public.insert_food_with_servings(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.insert_food_with_servings(jsonb, jsonb) to service_role;
