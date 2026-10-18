-- Trigger functions only need to run as triggers, never through /rpc
revoke execute on function public.handle_new_user()             from public, anon, authenticated;
revoke execute on function public.sync_verification_counts()    from public, anon, authenticated;
revoke execute on function public.reset_verifications_on_edit() from public, anon, authenticated;
revoke execute on function public.delete_private_foods()        from public, anon, authenticated;

-- Covering indexes for the log's foreign keys (used by on delete set null)
create index log_entries_food_idx    on public.log_entries (food_id)    where food_id is not null;
create index log_entries_serving_idx on public.log_entries (serving_id) where serving_id is not null;
