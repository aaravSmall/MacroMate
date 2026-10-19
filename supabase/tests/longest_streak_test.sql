-- Checks public.longest_streak_from_dates against the client spec
-- (src/features/logging/__tests__/streak.test.ts → longestStreak). Runs in a transaction that
-- rolls back:
--   npx supabase db query --linked -f supabase/tests/longest_streak_test.sql
begin;

do $$
declare
  check_case record;
begin
  for check_case in
    select * from (values
      ('no logs', array[]::date[], 0),
      ('single day', array[date '2026-10-16'], 1),
      ('longest, not latest', array[date '2026-10-01', date '2026-10-02', date '2026-10-03',
        date '2026-10-04', date '2026-10-10', date '2026-10-11'], 4),
      ('crosses months', array[date '2026-10-30', date '2026-10-31', date '2026-11-01'], 3),
      ('crosses years', array[date '2025-12-31', date '2026-01-01'], 2),
      ('order, duplicates, nulls ignored', array[date '2026-10-03', null, date '2026-10-01',
        date '2026-10-02', date '2026-10-02'], 3)
    ) as v(name, days, expected)
  loop
    if public.longest_streak_from_dates(check_case.days) <> check_case.expected then
      raise exception 'longest_streak_from_dates "%": expected %, got %', check_case.name,
        check_case.expected, public.longest_streak_from_dates(check_case.days);
    end if;
  end loop;
  raise notice 'longest_streak: all checks passed';
end;
$$;

rollback;
