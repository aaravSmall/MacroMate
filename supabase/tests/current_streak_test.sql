-- Checks public.current_streak / streak_from_dates against the client spec
-- (src/features/logging/__tests__/streak.test.ts). Runs in a transaction that rolls back:
--   npx supabase db query --linked -f supabase/tests/current_streak_test.sql
-- Each failed case raises an exception; success prints 'current_streak: all checks passed'.
begin;

do $$
declare
  t date := date '2026-10-16';
  check_case record;
begin
  for check_case in
    select * from (values
      ('no logs', array[]::date[], t, 0),
      ('consecutive ending today', array[t, t - 1, t - 2], t, 3),
      ('from yesterday when today has none', array[t - 1, t - 2], t, 2),
      ('stops at the first gap', array[t, t - 1, t - 3], t, 2),
      ('0 when last log was 2+ days ago', array[t - 2, t - 3], t, 0),
      ('crosses month boundaries', array[date '2026-11-02', date '2026-11-01', date '2026-10-31'], date '2026-11-02', 3),
      ('duplicates and nulls ignored', array[t, t, null, t - 1], t, 2),
      ('future dates ignored', array[t + 1, t, t - 1], t, 2)
    ) as v(name, days, today, expected)
  loop
    if public.streak_from_dates(check_case.days, check_case.today) <> check_case.expected then
      raise exception 'streak_from_dates "%": expected %, got %', check_case.name,
        check_case.expected, public.streak_from_dates(check_case.days, check_case.today);
    end if;
  end loop;

  -- No cap: a 400-day streak (the client used to look back only 120 days).
  if public.streak_from_dates(array(select t - g from generate_series(0, 399) g), t) <> 400 then
    raise exception 'streak_from_dates: expected an uncapped 400-day streak';
  end if;
end $$;

-- current_streak with real rows for a throwaway user, as that user (RLS applies).
do $$
declare
  uid uuid := gen_random_uuid();
  tz text := 'Pacific/Auckland';
  today date := (now() at time zone tz)::date;
  got integer;
begin
  insert into auth.users (id, aud, role, email) values (uid, 'authenticated', 'authenticated', uid || '@example.test');
  insert into public.log_entries (user_id, local_date, meal, food_name, calories)
  select uid, today - g, 'snack', 'streak test', 100 from generate_series(0, 129) g;   -- 130 days
  insert into public.log_entries (user_id, local_date, meal, food_name, calories)
  values (uid, today - 131, 'snack', 'after the gap', 100);

  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  got := public.current_streak(tz);
  if got <> 130 then raise exception 'current_streak: expected 130, got %', got; end if;
  got := public.current_streak('Not/AZone'); -- falls back to UTC without erroring
  if got < 129 then raise exception 'current_streak fallback: expected ~130, got %', got; end if;
  reset role;

  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    perform public.current_streak(tz);
    raise exception 'current_streak: anon should not be able to execute it';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;

select 'current_streak: all checks passed' as result;
rollback;
