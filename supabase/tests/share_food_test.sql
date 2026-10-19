-- Checks share_food(): only the owner can share their private food, other users can then read
-- it, nobody can set visibility directly, and the owner can't delete it once shared. Runs in a
-- transaction that rolls back:
--   npx supabase db query --linked -f supabase/tests/share_food_test.sql
begin;

do $$
declare
  owner uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  food uuid;
  recipe uuid;
  n integer;
begin
  insert into auth.users (id, aud, role, email) values
    (owner, 'authenticated', 'authenticated', owner || '@example.test'),
    (other, 'authenticated', 'authenticated', other || '@example.test');

  -- Owner creates a private product and a private recipe.
  perform set_config('request.jwt.claims', json_build_object('sub', owner, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.foods (owner_id, source, name, calories) values (owner, 'user_product', 'My bar', 200)
    returning id into food;
  insert into public.foods (owner_id, source, name, calories, base_amount, base_unit)
    values (owner, 'user_recipe', 'My chili', 400, 1, 'serving') returning id into recipe;

  -- Setting visibility directly is not allowed, even on an editable recipe.
  begin
    update public.foods set visibility = 'public' where id = recipe;
    raise exception 'owner set visibility directly';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- Another user can't see it, and can't share it.
  perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.foods where id = food;
  if n <> 0 then raise exception 'other user could read a private food'; end if;
  begin
    perform public.share_food(food);
    raise exception 'other user shared someone else''s food';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- The owner shares it.
  perform set_config('request.jwt.claims', json_build_object('sub', owner, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.share_food(food);
  -- Sharing twice fails (it's no longer private).
  begin
    perform public.share_food(food);
    raise exception 'shared an already public food';
  exception when insufficient_privilege then null;
  end;
  -- Once public, the owner can't delete it.
  delete from public.foods where id = food;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'owner deleted a shared food'; end if;
  reset role;

  -- Now the other user can read it.
  perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.foods where id = food and visibility = 'public';
  if n <> 1 then raise exception 'other user could not read a shared food'; end if;
  reset role;

  -- Deleting the owner's account leaves it public with no owner.
  delete from auth.users where id = owner;
  if not exists (select 1 from public.foods where id = food and owner_id is null and visibility = 'public') then
    raise exception 'shared food did not stay public without an owner';
  end if;
  if exists (select 1 from public.foods where id = recipe) then
    raise exception 'private recipe survived account deletion';
  end if;

  raise notice 'share_food: all checks passed';
end;
$$;

rollback;
