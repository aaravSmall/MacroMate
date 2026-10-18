-- Checks that owners can edit or delete servings only on their own recipes, never on their own
-- products. Runs in a transaction that rolls back:
--   npx supabase db query --linked -f supabase/tests/food_servings_rls_test.sql
-- RLS filters rows silently (0 rows affected), so each check reads the row back as postgres.
begin;

do $$
declare
  uid uuid := gen_random_uuid();
  product_id uuid;
  recipe_id uuid;
  product_serving uuid;
  recipe_serving uuid;
  n integer;
begin
  insert into auth.users (id, aud, role, email) values (uid, 'authenticated', 'authenticated', uid || '@example.test');
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- The user creates a private product and a recipe, each with a serving (allowed).
  insert into public.foods (owner_id, source, name, calories) values (uid, 'user_product', 'My bar', 200)
    returning id into product_id;
  insert into public.food_servings (food_id, label, base_multiplier, is_default) values (product_id, '1 bar', 1, true)
    returning id into product_serving;
  insert into public.foods (owner_id, source, name, calories, base_amount, base_unit)
    values (uid, 'user_recipe', 'My stir-fry', 500, 1, 'serving') returning id into recipe_id;
  insert into public.food_servings (food_id, label, base_multiplier, is_default) values (recipe_id, '1 bowl', 1, true)
    returning id into recipe_serving;

  -- Product servings: update and delete affect nothing.
  update public.food_servings set label = 'hacked', base_multiplier = 9 where id = product_serving;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'user updated a serving of their own product (% rows)', n; end if;
  delete from public.food_servings where id = product_serving;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'user deleted a serving of their own product (% rows)', n; end if;

  -- Recipe servings: still editable.
  update public.food_servings set label = '1 large bowl' where id = recipe_serving;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'user could not update a serving of their own recipe'; end if;

  -- Deleting the product itself still removes its servings (cascade).
  delete from public.foods where id = product_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'user could not delete their own private product'; end if;
  reset role;

  if exists (select 1 from public.food_servings where id = product_serving) then
    raise exception 'servings of a deleted product were left behind';
  end if;
  if (select label from public.food_servings where id = recipe_serving) <> '1 large bowl' then
    raise exception 'recipe serving edit did not stick';
  end if;
end $$;

-- Before deleting: the product serving must be untouched by the blocked update.
do $$
declare
  uid uuid := gen_random_uuid();
  product_id uuid;
  serving uuid;
begin
  insert into auth.users (id, aud, role, email) values (uid, 'authenticated', 'authenticated', uid || '@example.test');
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.foods (owner_id, source, name, calories) values (uid, 'label_scan', 'Scanned crackers', 130)
    returning id into product_id;
  insert into public.food_servings (food_id, label, base_multiplier, is_default) values (product_id, '30 g', 0.3, true)
    returning id into serving;
  update public.food_servings set base_multiplier = 3 where id = serving;
  reset role;
  if (select base_multiplier from public.food_servings where id = serving) <> 0.3 then
    raise exception 'scanned product serving was changed';
  end if;
end $$;

select 'food_servings_rls: all checks passed' as result;
rollback;
