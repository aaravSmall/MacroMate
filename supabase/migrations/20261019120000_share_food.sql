-- Sharing a user's own food to the global database.
--
-- Clients can no longer write foods.visibility directly: the only way to change it is
-- share_food(), which flips the caller's own private food to public. Sharing is one-way; other
-- people may log a shared food, so it can't be pulled back or deleted by its owner
-- ("foods: delete own private"). If the owner deletes their account, owner_id is set null by the
-- foreign key and the food stays public.
--
-- Once public, editing rules are unchanged: only the owner's recipes (user_recipe) can be edited
-- ("foods: edit own recipes"), and nutrition changes reset label checks via trigger.
-- Public foods are readable by every signed-in user ("foods: read public or own"), so shared
-- foods appear in search with no other change.

revoke update (visibility) on public.foods from authenticated;

create function public.share_food(food_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.foods
     set visibility = 'public'
   where id = food_id
     and owner_id = (select auth.uid())
     and visibility = 'private'
     and source in ('user_product', 'user_recipe', 'label_scan');
  if not found then
    raise exception 'You can only share your own private foods.' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.share_food(uuid) from public, anon;
grant execute on function public.share_food(uuid) to authenticated;
