-- Daily dining menu sync at ~5 am Eastern.
--
-- pg_cron runs in UTC, so 09:00 UTC is 5:00 am EDT (4:00 am EST in winter). The first sync of a
-- new menu window can take several runs (each Edge Function run has a time budget and resumes
-- where the last stopped), so the job fires four times, ten minutes apart; later runs find
-- nothing left to do and finish quickly.
--
-- The function URL and the shared cron secret live in Vault (created out of band, never in
-- this repo): dining_sync_url, dining_cron_secret.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'sync-dining-daily',
  '0,10,20,30 9 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'dining_sync_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'dining_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $job$
);
