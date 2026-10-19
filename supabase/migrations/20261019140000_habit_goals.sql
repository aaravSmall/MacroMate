-- Habit goals for numbers-off mode: what the user tracks instead of calories. Starts with
-- protein (reach the active goal's protein target) and meals_logged (log 3 meals). Fruit/veg
-- servings and water can be added to the check list later.
alter table public.profiles
  add column habit_goals text[] not null default array['protein', 'meals_logged']::text[]
  constraint profiles_habit_goals_known check (habit_goals <@ array['protein', 'meals_logged']::text[]);
