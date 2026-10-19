# Launch checklist

Manual steps before real users sign up. Most of these are Supabase dashboard settings that
`supabase/config.toml` doesn't control for the hosted project (that file only configures the
local stack). Tick each one off in the production project.

## Auth (Supabase dashboard → Authentication)

- [ ] **Turn ON email confirmation**: Sign In / Providers → Email → _Confirm email_. The app
      handles the pending state (check-email screen with resend) and the link back in
      (`calorietracker://confirm-email`).
- [ ] **Enable leaked password protection** (HaveIBeenPwned check): Sign In / Providers → Email
      → _Prevent use of leaked passwords_. Requires the Pro plan.
- [ ] **Password rules**: minimum length **8**, requirements **letters and digits**. These match
      the app's `validateNewPassword` and `config.toml`.
- [ ] **Secure password change** on (re-authentication needed to change the password).
- [ ] **URL configuration**: set _Site URL_, and add these to _Redirect URLs_:
  - `calorietracker://confirm-email`
  - `calorietracker://reset-password`
  - Remove `exp://**` and any localhost entries from production.
- [ ] **Custom SMTP**: the built-in mailer allows only a few emails per hour and is for testing.
      Configure a real provider (Project Settings → Auth → SMTP), then raise the email rate limit
      to fit.
- [ ] **Email templates**: reword _Confirm signup_ and _Reset password_ in the app's voice and
      check that the links use `{{ .ConfirmationURL }}`.
- [ ] **Rate limits** (Authentication → Rate Limits): keep sign-ups/sign-ins at roughly 30 per
      5 minutes per IP, token verifications at 30, and resend interval at 60 s (the app's resend
      button has a 60 s cooldown).
- [ ] Anonymous sign-ins stay **off**. Consider CAPTCHA (Turnstile/hCaptcha) if sign-up abuse
      appears.

## Demo and test accounts

- [ ] **Delete the demo user from production.** `demo@example.com` / `demo123` (from
      `supabase/seed.sql`) exists on the hosted project, and its password is public in this repo.
- [ ] **Remove or gate the "demo" username shortcut.** `resolveLoginEmail` in
      `src/features/auth/demoAccount.ts` maps "demo" to that account in every build, not just
      development (only the hint card is `__DEV__`-only).
- [ ] Clear any remaining E2E data first if you keep the account for staging:
      `npm run demo:clear -- --confirm` (needs the service role key in the environment).

## Database

- [ ] **Apply pending migrations** to the linked project, then regenerate types:
  ```bash
  npx supabase db push
  npm run db:types
  ```
  Pending as of this checklist: `20261019120000_share_food`, `20261019130000_longest_streak`,
  `20261019140000_habit_goals`, `20261019150000_insert_food_allergens`. Until they're applied,
  sharing foods, the longest streak, saving habit choices, and storing OFF allergens won't work
  (`database.ts` has their types added by hand; `db:types` will match).
- [ ] **Run the SQL checks** against the linked project (each rolls back):
  ```bash
  for f in supabase/tests/*.sql; do npx supabase db query --linked -f "$f"; done
  ```
- [ ] **Deploy Edge Functions** changed since the last deploy:
      `npx supabase functions deploy cache-off-food` (stores OFF allergens).
- [ ] **Check the advisors** (Dashboard → Advisors, or the Supabase MCP `get_advisors`): resolve
      every _Security_ finding (RLS disabled, mutable `search_path`, exposed functions) and
      review _Performance_ (unindexed foreign keys, RLS `auth.uid()` re-evaluation).
- [ ] Confirm **RLS is enabled on every table** (`docs/SCHEMA.md` → Security).
- [ ] Turn on **Point-in-Time Recovery** or confirm daily backups for the plan.
- [ ] **Upload restaurant data**: `npm run restaurants:upload -- wingstop chipotle fiveguys`
      (dry run), review the samples, then add `--yes`. Needs
      `scripts/restaurants/.env.local` with the service role key.
- [ ] The service role / secret key lives only in local `.env.local` files and Edge Function
      secrets. Never in the app or in git.

## Safety content

- [ ] **Verify every Help page number and link** against the official sites
      (`src/constants/helpResources.ts`): 988 Lifeline, Crisis Text Line, National Alliance for
      Eating Disorders (number and hours).
- [ ] Clinical review of the thresholds in `src/constants/safety.ts` (each has a TODO): calorie
      floor, 2 lb/week loss and 1 lb/week gain caution, and `GOAL_CELEBRATE_RANGE`.
- [ ] Re-read `docs/PRODUCT.md` → Safety rules against the current UI copy.

## App Store

- [ ] Production build points at the production Supabase URL and publishable key via EAS
      environment variables (not the dev `.env`).
- [ ] Privacy policy URL, and App Privacy answers covering health and fitness data (HealthKit
      workouts, weight), email, and food logs.
- [ ] HealthKit usage descriptions, camera (label scanning), and notification wording reviewed.
- [ ] Open Food Facts attribution (ODbL) shown in the app and README.
- [ ] Account deletion works end to end on production (Account → Delete account).
