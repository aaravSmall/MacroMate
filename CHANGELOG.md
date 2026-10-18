# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **Goals:** changing goals is now atomic. A new `change_goal()` Postgres function ends the active goal and starts the new one in one transaction, so a failure part-way can no longer leave you without an active goal. Onboarding and later goal changes both use it.

### Changed

- **New database schema:** the app now uses the rebuilt schema (`profiles`, `goals`, `foods`, `food_servings`, `food_verifications`, `log_entries`, `exercise_entries`, `weigh_ins`, and the `daily_totals` view), with types generated from the project.
- **Goals:** onboarding saves body stats to `profiles` and targets to a new `goals` row. Changing goals ends the active one and starts a new one.
- **Foods:** nutrition is stored per base amount (100 g/ml or 1 serving) with named servings. Foods you create are private and can be deleted; only recipes are editable.
- **Logging:** entries store a snapshot (food × serving × amount) and a `local_date` in your timezone. Today's totals and the streak come from `daily_totals`.
- **Settings:** the weigh-in schedule lives on the profile. The reminders on/off toggle is removed until reminders ship.

### Added

- **Label checks:** logging a public food someone else added asks "Does this match your label?" Search results show both counts and a gentle heads-up when mismatches outnumber matches.

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
