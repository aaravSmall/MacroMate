# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Dining hall menus (Purdue):** Add → Dining halls shows today's meals and stations at Purdue's dining courts (remembering your last location); tap an item to log it with the usual form and portion helper. Nutrition, allergens, diet tags, and ingredients come from Purdue's public HFS menus API, synced daily at ~5 am Eastern by the `sync-dining` Edge Function (pg_cron + pg_net, polite and resumable). Each dish is one public food reused across days, so dining items also show up in regular search; menu changes never touch past logs. New: `dining_hall` food source, `dining_locations` / `dining_menu_items`, and `upsert_provider_food`.

- **Restaurant import pipeline** (`scripts/restaurants/`, local tooling, not shipped): extracts tables from chains' official nutrition PDFs, normalizes them to `foods` + `food_servings` (source `restaurant`, public), checks calories against 4/4/9 macros, and writes reviewable JSON. A separate, dry-run-by-default upload step upserts reviewed items with stable natural keys using a local service-role key. Starts with Wingstop, Chipotle, and Five Guys (not uploaded yet).
- **Portion helper:** "Not sure how much?" on the log form opens visual references (a deck of cards or your palm for meat, two dice for cheese, a fist for a cup, your thumb for a tablespoon, shares of a 10-inch plate) and fills in the amount in the food's serving, which you can still adjust. Only references that convert honestly for that serving are shown. Sources: NIH NHLBI, the Academy of Nutrition and Dietetics, and USDA MyPlate.
- **Meals you made:** Create food now asks "Packaged product" or "Meal I made". Meals are stored per serving and can be edited later from their food page (Edit meal); packaged, scanned, Open Food Facts, and restaurant foods keep their label values and can't be edited. Editing a meal never changes entries you already logged, since each entry keeps its own snapshot. Saving changes to a shared meal warns that its label checks will reset.
- **Weigh-in reminders:** a reminders switch in Settings schedules gentle local notifications from your weigh-in schedule (weekly, every other week from your last weigh-in, or the first chosen weekday of each month), in your time zone and keeping the same local time across daylight saving changes. Notification permission is asked only after an explanation, when you turn reminders on or finish onboarding, never at launch. Reminders reschedule on launch, after a schedule change, and after a weigh-in, and are cancelled on sign-out and account deletion. Tapping one opens Progress with the weigh-in field ready.
- **Apple Health sync:** connect Apple Health in Settings (read-only: workouts and active energy; Tally never writes to Health). Workouts from any app or device that saves to Health (Apple Watch, Hevy, Fitbit, …) sync when the app opens or returns to the foreground and when you pull down on Today, covering the time since the last sync (the last 7 days the first time). Entries are upserted by HealthKit id, and workouts deleted in Health are removed. Burned calories add to the day's budget, and after a workout today a dismissible, once-per-workout refuel note appears (without numbers in numbers-off mode).
- **Nutrition label scanning:** Add → Scan nutrition label lets you take or choose a photo of a printed Nutrition Facts panel. It's read on the device (Apple Vision via `expo-text-extractor`; free, offline, never uploaded or saved), parsed into serving size, calories, macros, sugars, sodium, cholesterol, and printed vitamins and minerals, and opens the create-food form prefilled, with hard-to-read or missing fields highlighted for you to check. Photos of meals aren't estimated. The create-food form also gains trans fat, added sugars, vitamin D, calcium, iron, potassium, magnesium, and zinc.
- **Development builds:** the app now runs in an Expo development build (`expo-dev-client`) instead of Expo Go, so native modules can be added. New `eas.json` profiles (development, development-simulator, preview, production), an iOS bundle identifier, and scripts: `npm run ios`, `npm run ios:device`, `npm run build:dev`, `npm run build:dev:sim`, `npm run build:preview`, `npm run build:prod`, `npm run prebuild:clean`.
- **Password reset:** the link in the reset email now opens a "Choose a new password" screen. It works with implicit-flow tokens, PKCE codes, and token-hash links, and shows a clear message with a way to request a new link when the link is expired or already used. While a reset is in progress, the app stays on that screen instead of jumping to onboarding or Today.
- **Account deletion:** Account → Delete account now permanently deletes your account through the `delete-account` Edge Function. It deletes only the signed-in caller, verified from their session token; your profile, goals, logs, exercise, weigh-ins, label checks, and private foods are removed, and public foods you added stay without your name. The app then signs out on this device and clears its cached data.
- **Cached Open Food Facts foods:** logging an Open Food Facts result now saves it as a global food through the `cache-off-food` Edge Function, which fetches the nutrition from Open Food Facts itself. Entries link to a real food with portions (`100 g`, `1 g`, `1 oz`, plus the product's own serving), the food can collect label checks, and other users find it in search instead of re-fetching it.
- **Label checks:** logging a public food someone else added (including cached Open Food Facts foods) asks "Does this match your label?" Search results show both counts and a gentle heads-up when mismatches outnumber matches.

### Changed

- **Food search** matches every word in any order across name and brand (e.g. "wingstop lemon pepper") and ranks chain + item matches first.
- **Logging streak on the server:** the Progress streak now comes from a `current_streak(p_tz)` database function (consecutive days with a log, ending today or yesterday in your time zone; any logged day counts), so it's no longer capped at 120 days. `supabase/tests/current_streak_test.sql` checks it against the client spec.
- **New database schema:** the app now uses the rebuilt schema (`profiles`, `goals`, `foods`, `food_servings`, `food_verifications`, `log_entries`, `exercise_entries`, `weigh_ins`, and the `daily_totals` view), with types generated from the project.
- **Goals:** onboarding saves body stats to `profiles` and targets to a new `goals` row. Changing goals ends the active one and starts a new one.
- **Foods:** nutrition is stored per base amount (100 g/ml or 1 serving) with named servings. Foods you create are private and can be deleted; only recipes are editable.
- **Logging:** entries store a snapshot (food × serving × amount) and a `local_date` in your timezone. Today's totals and the streak come from `daily_totals`.
- **Settings:** the weigh-in schedule lives on the profile.

### Fixed

- **Drinks from Open Food Facts:** drinks are now stored per 100 ml with ml portions (the can or bottle, `100 ml`, `1 fl oz`, `1 cup`) instead of per 100 g. Products sold by volume but served by weight, like ice cream tubs, stay per 100 g.
- **Caching is atomic:** a cached Open Food Facts food and its portions are inserted in one transaction (`insert_food_with_servings`), so a food is never visible without its servings, and simultaneous requests share one row.
- **Edge Function auth:** `cache-off-food` and `delete-account` share one auth check that verifies the caller's session with `auth.getUser`, since `verify_jwt` alone admitted publishable-key-only requests.
- **Goals:** changing goals is now atomic. A new `change_goal()` Postgres function ends the active goal and starts the new one in one transaction, so a failure part-way can no longer leave you without an active goal. Onboarding and later goal changes both use it.

## [0.1.0] - 2026-10-16 — Skeleton

The first working skeleton: every main flow exists in bare-bones form, backed by a real schema.

### Added

- **Project setup:** Expo SDK 58 with Expo Router, strict TypeScript, and the `@/` → `src/` alias. ESLint, Prettier, EditorConfig, and Jest with React Native Testing Library.
- **Docs:** README, product spec, architecture, schema (with ER diagram), contributing guide, and `CLAUDE.md`.
- **Navigation and design system:** route groups for auth, onboarding, tabs (Today, Add, Progress, Account), and modals. Light/dark theme tokens with a single neutral "logged" color, plus UI primitives.
- **Auth:** Supabase client with persisted sessions and env validation. Email sign-in, sign-up, and password reset. A root gate that routes between auth, onboarding, and the app.
- **Database:** initial Supabase migration (profiles, foods, user_foods, food_logs, exercise_entries, weigh_ins, user_settings). RLS on every table, cascade deletion of user data, a new-user trigger, trigram search indexes, seed foods, and typed client.
- **Data layer:** TanStack Query hooks with centralized query keys and optimistic add/delete for logs. Domain types, an Open Food Facts adapter, and a pure daily-summary selector.
- **Goals and safety:** Mifflin-St Jeor BMR/TDEE, daily target (~3,500 kcal/lb), and a calorie floor offered as a recommendation. Pace and day-status assessments that never block, a `CareNotice` component, snack ideas, and help resources.
- **Screens:**
  - Today: date switcher, summary card with macros, timeline grouped by meal, and exercise list.
  - Add: debounced search across the database, My Foods, and Open Food Facts. Food detail with servings and a suggested meal label. Create food.
  - Log-entry edit and delete.
  - Progress: weigh-ins, logging streak, and a neutral calendar.
  - Seven-step onboarding that saves the profile and computed target.
  - Account: settings (units, numbers-off, weigh-in schedule), help, and delete account.
- **CI:** GitHub Actions for lint, typecheck, and tests. Issue and pull request templates.

### Not yet implemented

- Nutrition label scanning, restaurant data, and sharing My Foods to the global database.
- Apple Health sync (needs a development build).
- Weigh-in reminder notifications (the schedule is saved, nothing is scheduled yet).
- Account deletion (needs a Supabase Edge Function).

[Unreleased]: https://github.com/aaravSmall/MacroMate/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/aaravSmall/MacroMate/releases/tag/v0.1.0
