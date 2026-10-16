# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
