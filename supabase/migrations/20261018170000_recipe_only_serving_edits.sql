-- Servings can only be edited or removed on the owner's own recipes (user_recipe). Products
-- (user_product, label_scan) keep their label values and are never edited; deleting a private
-- food still removes its servings through the foreign key's cascade. Adding servings to a new
-- food of your own is unchanged.

drop policy "servings: edit own private or recipe" on public.food_servings;
drop policy "servings: delete own private or recipe" on public.food_servings;

create policy "servings: edit own recipes" on public.food_servings for update to authenticated
  using (exists (select 1 from public.foods f
                  where f.id = food_id and f.owner_id = (select auth.uid())
                    and f.source = 'user_recipe'))
  with check (exists (select 1 from public.foods f
                       where f.id = food_id and f.owner_id = (select auth.uid())
                         and f.source = 'user_recipe'));

create policy "servings: delete own recipes" on public.food_servings for delete to authenticated
  using (exists (select 1 from public.foods f
                  where f.id = food_id and f.owner_id = (select auth.uid())
                    and f.source = 'user_recipe'));
