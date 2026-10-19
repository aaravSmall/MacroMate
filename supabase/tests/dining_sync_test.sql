-- Checks upsert_provider_food idempotency and that past logs keep their numbers when a dining
-- item's nutrition changes. Runs in a transaction that rolls back:
--   npx supabase db query --linked -f supabase/tests/dining_sync_test.sql
begin;

do $$
declare
  uid uuid := gen_random_uuid();
  food jsonb := jsonb_build_object(
    'source', 'dining_hall', 'provider', 'test-provider', 'provider_item_id', 'item-1',
    'external_id', 'test-provider:item-1', 'name', 'Test Fajitas', 'brand', 'Test Dining',
    'base_amount', 1, 'base_unit', 'serving', 'calories', 216.28, 'protein_g', 27.8,
    'carbs_g', 9.19, 'fat_g', 7.62, 'sodium_mg', 1491.35, 'micros', '{"calcium_mg": 16.42}',
    'allergens', '["gluten","soy"]'::jsonb, 'diet_tags', '[]'::jsonb, 'ingredients', 'Chicken');
  servings jsonb := '[{"label": "1 cup", "base_multiplier": 1, "is_default": true}]';
  id1 uuid; id2 uuid; serving1 uuid; serving2 uuid; log_id uuid;
  n integer; logged numeric;
begin
  id1 := public.upsert_provider_food(food, servings);
  select id into serving1 from public.food_servings where food_id = id1;

  -- Same payload again: same food, same serving, nothing duplicated.
  id2 := public.upsert_provider_food(food, servings);
  if id1 <> id2 then raise exception 'upsert created a second food'; end if;
  select count(*) into n from public.foods where provider = 'test-provider';
  if n <> 1 then raise exception 'expected 1 food, got %', n; end if;
  select count(*) into n from public.food_servings where food_id = id1;
  if n <> 1 then raise exception 'expected 1 serving, got %', n; end if;
  if (select allergens from public.foods where id = id1) <> '{gluten,soy}' then
    raise exception 'allergens not stored';
  end if;

  -- A user logs it (snapshot = food × serving × quantity, as the app computes).
  insert into auth.users (id, aud, role, email) values (uid, 'authenticated', 'authenticated', uid || '@example.test');
  insert into public.log_entries (user_id, food_id, serving_id, quantity, local_date, meal, food_name, calories, protein_g)
  values (uid, id1, serving1, 1.5, current_date, 'dinner', 'Test Fajitas', 216.28 * 1.5, 27.8 * 1.5)
  returning id into log_id;

  -- Purdue changes the recipe: nutrition and serving size change.
  food := food || '{"calories": 260, "protein_g": 30, "name": "Test Fajitas (new recipe)"}';
  id2 := public.upsert_provider_food(food, servings);
  select id into serving2 from public.food_servings where food_id = id1 and is_default;
  if id2 <> id1 or serving2 <> serving1 then raise exception 'ids changed on update'; end if;
  if (select calories from public.foods where id = id1) <> 260 then raise exception 'nutrition not updated'; end if;

  -- The past log entry keeps its own numbers and its links.
  select calories into logged from public.log_entries where id = log_id;
  if logged <> 324.42 then raise exception 'past log changed: % (expected 324.42)', logged; end if;
  if (select food_id from public.log_entries where id = log_id) <> id1 then raise exception 'log lost its food'; end if;
  if (select serving_id from public.log_entries where id = log_id) <> serving1 then raise exception 'log lost its serving'; end if;

  -- Allergen status survives the upsert: NULL = no data, '{}' = none listed.
  id2 := public.upsert_provider_food(food - 'allergens' || '{"provider_item_id": "item-2", "external_id": "test-provider:item-2"}', servings);
  if (select allergens from public.foods where id = id2) is not null then
    raise exception 'missing allergen data should be stored as NULL';
  end if;
  id2 := public.upsert_provider_food(food || '{"provider_item_id": "item-3", "external_id": "test-provider:item-3", "allergens": []}', servings);
  if (select allergens from public.foods where id = id2) <> '{}' then
    raise exception 'an empty allergen list should be stored as {}';
  end if;

  -- Clients can't call the RPC or write menus.
  set local role authenticated;
  begin
    perform public.upsert_provider_food(food, servings);
    raise exception 'authenticated should not execute upsert_provider_food';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.dining_locations (provider, external_id, name) values ('x', 'y', 'z');
    raise exception 'authenticated should not insert dining_locations';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;

select 'dining_sync: all checks passed' as result;
rollback;
