-- Logging streak, computed on the server so it isn't capped by a client lookback window.
--
-- Spec: src/features/logging/logic/streak.ts (currentStreak). Consecutive days with at least one
-- log entry, ending today; if today has no entry yet, ending yesterday. Any logged day counts,
-- whatever the calories. supabase/tests/current_streak_test.sql checks the same cases.

-- Pure helper: the streak for a set of logged dates as of `p_today`.
create function public.streak_from_dates(p_days date[], p_today date)
returns integer
language sql
immutable
set search_path = ''
as $$
  with days as (
    select distinct d from unnest(p_days) as d where d is not null
  ),
  anchor as (
    select case
             when exists (select 1 from days where d = p_today) then p_today
             when exists (select 1 from days where d = p_today - 1) then p_today - 1
           end as s
  ),
  ranked as (
    select d, a.s - d as gap, (row_number() over (order by d desc) - 1)::integer as rn
      from days, anchor a
     where a.s is not null and d <= a.s
  )
  -- Days counting back from the anchor with no gap: offset from the anchor equals position.
  select count(*)::integer from ranked where gap = rn;
$$;

-- The signed-in user's streak, with "today" in their time zone (falls back to UTC if p_tz isn't
-- a known zone). security invoker: RLS on log_entries limits it to the caller's rows; the
-- user_id filter also uses the (user_id, local_date) index.
create function public.current_streak(p_tz text)
returns integer
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  today date;
begin
  if (select auth.uid()) is null then
    return 0;
  end if;
  begin
    today := (now() at time zone p_tz)::date;
  exception when others then
    today := (now() at time zone 'UTC')::date;
  end;
  return public.streak_from_dates(
    array(select distinct local_date from public.log_entries where user_id = (select auth.uid())),
    today
  );
end;
$$;

revoke execute on function public.streak_from_dates(date[], date) from public, anon;
grant execute on function public.streak_from_dates(date[], date) to authenticated, service_role;
revoke execute on function public.current_streak(text) from public, anon;
grant execute on function public.current_streak(text) to authenticated;
