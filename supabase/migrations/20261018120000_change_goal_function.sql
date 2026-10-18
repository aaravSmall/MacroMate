-- Change goals atomically: end the active goal and start the new one in one transaction.
-- security invoker, so RLS on goals ("own goals") still applies.
create function public.change_goal(
  p_goal_type            public.goal_type,
  p_start_weight_kg      numeric,
  p_daily_calorie_target integer,
  p_target_weight_kg     numeric default null,
  p_target_body_fat_pct  numeric default null,
  p_pace_kg_per_week     numeric default 0,
  p_protein_target_g     integer default null,
  p_carbs_target_g       integer default null,
  p_fat_target_g         integer default null
)
returns public.goals
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_goal public.goals;
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  update public.goals
     set ended_at = now()
   where user_id = (select auth.uid()) and ended_at is null;

  insert into public.goals (user_id, goal_type, start_weight_kg, target_weight_kg, target_body_fat_pct,
                            pace_kg_per_week, daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g)
  values ((select auth.uid()), p_goal_type, p_start_weight_kg, p_target_weight_kg, p_target_body_fat_pct,
          p_pace_kg_per_week, p_daily_calorie_target, p_protein_target_g, p_carbs_target_g, p_fat_target_g)
  returning * into new_goal;

  return new_goal;
end;
$$;

revoke execute on function public.change_goal(public.goal_type, numeric, integer, numeric, numeric, numeric, integer, integer, integer) from public, anon;
grant  execute on function public.change_goal(public.goal_type, numeric, integer, numeric, numeric, numeric, integer, integer, integer) to authenticated;
