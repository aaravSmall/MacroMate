-- Longest logging streak ever, for the Progress tab. Spec: src/features/logging/logic/streak.ts
-- (longestStreak). Any logged day counts, whatever the calories.
-- supabase/tests/longest_streak_test.sql checks the same cases.

-- Pure helper: the longest run of consecutive dates (gaps and islands).
create function public.longest_streak_from_dates(p_days date[])
returns integer
language sql
immutable
set search_path = ''
as $$
  with days as (
    select distinct d from unnest(p_days) as d where d is not null
  ),
  islands as (
    -- Consecutive dates share the same (date - position).
    select d - (row_number() over (order by d))::integer as island from days
  )
  select coalesce(max(n), 0)::integer from (select count(*) as n from islands group by island) runs;
$$;

-- The signed-in user's longest streak. security invoker: RLS on log_entries limits it to the
-- caller's rows; the user_id filter also uses the (user_id, local_date) index.
create function public.longest_streak()
returns integer
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return 0;
  end if;
  return public.longest_streak_from_dates(
    array(select distinct local_date from public.log_entries where user_id = (select auth.uid()))
  );
end;
$$;

revoke execute on function public.longest_streak_from_dates(date[]) from public, anon;
grant execute on function public.longest_streak_from_dates(date[]) to authenticated, service_role;
revoke execute on function public.longest_streak() from public, anon;
grant execute on function public.longest_streak() to authenticated;
