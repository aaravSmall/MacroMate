-- Development seed (`supabase db reset` runs this after migrations).
--
-- No global foods are seeded: Open Food Facts and restaurant foods are written only by the
-- service role (an Edge Function, not built yet), and food search falls back to Open Food Facts.

-- ---------------------------------------------------------------------------
-- Demo account for development: username "demo" (email demo@example.com), password "demo123".
-- The app maps the "demo" username to this email (src/features/auth/demoAccount.ts).
-- The credentials are public in this repo, so only seed projects you use for development.
-- The on_auth_user_created trigger creates its profile row; it has no goal yet, so it starts
-- at onboarding like any new user.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000',
  'd3e0d3e0-0000-4000-8000-00000000de30',
  'authenticated',
  'authenticated',
  'demo@example.com',
  extensions.crypt('demo123', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  'd3e0d3e0-0000-4000-8000-00000000de30',
  'd3e0d3e0-0000-4000-8000-00000000de30',
  'd3e0d3e0-0000-4000-8000-00000000de30',
  'email',
  '{"sub": "d3e0d3e0-0000-4000-8000-00000000de30", "email": "demo@example.com", "email_verified": true}',
  now(),
  now(),
  now()
) on conflict do nothing;
