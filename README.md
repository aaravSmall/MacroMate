# Tally

[![CI](https://github.com/aaravSmall/MacroMate/actions/workflows/ci.yml/badge.svg)](https://github.com/aaravSmall/MacroMate/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**A free, open-source calorie tracker — every feature free, no paywall.**

> "Tally" is a placeholder name. The display name lives in one place: `expo.name` in [`app.json`](app.json).

## Why

Most popular calorie trackers lock their most useful features — barcode/label scanning, macro goals, exercise sync — behind a subscription. Tally exists out of frustration with that. It's built first for my own daily use and as a portfolio project, but it's open to anyone who wants a full-featured tracker without a paywall.

## Screenshots

<!-- Replace these placeholders with real screenshots (docs/screenshots/*.png, ~1290×2796). -->

| Today                            | Add food                  | Progress                                | Help                           |
| -------------------------------- | ------------------------- | --------------------------------------- | ------------------------------ |
| _Screenshot: Today summary card_ | _Screenshot: food search_ | _Screenshot: weight trend and calendar_ | _Screenshot: help & resources_ |

## Features

| Feature                                                                                             | Status |
| --------------------------------------------------------------------------------------------------- | ------ |
| Accounts with cloud sync and email confirmation                                                     | Done   |
| Food logging three ways: search, create your own food, or scan a nutrition label photo to auto-fill | Done   |
| Global food database: Open Food Facts, chain restaurant nutrition, and Purdue dining hall menus     | Done   |
| Private "My Foods", optionally shared to the global database                                        | Done   |
| Community label checks on shared foods ("✓ 24 · ✗ 2")                                               | Done   |
| Calories, protein, carbs, fat, plus micronutrients from the label                                   | Done   |
| Goals for losing, maintaining, or gaining weight, with caring pace warnings                         | Done   |
| Apple Health workout sync (burned calories add to your daily budget) and refuel prompts             | Done   |
| Weigh-ins with reminders and a weight trend chart                                                   | Done   |
| Logging streaks and a neutral logging calendar                                                      | Done   |
| Optional "numbers off" mode with habit goals                                                        | Done   |
| Allergy and dietary restriction flags                                                               | Done   |
| Help & resources page                                                                               | Done   |

Tally does **not** guess calories from a photo of a meal. Label scanning reads the printed nutrition facts panel, which is accurate; meal-photo estimation isn't.

## Design principles

- **Encourage healthy choices, don't force them.** Users stay in control of their goals and their data.
- **Never celebrate undereating.** Coming in far under budget is not a win, and the app never treats it like one.
- **No red/green judgment on the calendar.** The calendar shows whether you logged, not whether you were "good".
- **Safety warnings are caring, not blocking.** Risky goals or paces get a kind explanation and pointers to help — never a locked door.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the full product spec.

## Tech stack

| Layer         | Choice                                                    |
| ------------- | --------------------------------------------------------- |
| App framework | [Expo](https://expo.dev) / React Native                   |
| Navigation    | [Expo Router](https://docs.expo.dev/router/introduction/) |
| Language      | TypeScript (strict)                                       |
| Backend       | [Supabase](https://supabase.com) — Postgres + Auth        |
| Server state  | [TanStack Query](https://tanstack.com/query)              |
| Client state  | [Zustand](https://zustand.docs.pmnd.rs)                   |
| Food data     | [Open Food Facts](https://world.openfoodfacts.org)        |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together.

## Getting started

### Prerequisites

- Node.js 20+ and npm
- Xcode 26+ with an iOS Simulator and CocoaPods (macOS)
- For a physical iPhone: an Apple Developer account (needed to sign the dev build)
- A Supabase project (free tier is fine)

### Setup

```bash
git clone https://github.com/aaravSmall/MacroMate.git
cd MacroMate
npm install
cp .env.example .env   # then fill in your Supabase URL and anon key
npm run ios            # builds the dev client, installs it in the Simulator, and starts Metro
```

### Supabase backend

The app needs a Supabase project (hosted, or local with Docker). Use the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) through `npx supabase`.

**Hosted project**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push            # apply supabase/migrations/*
npm run db:types                # regenerate src/types/database.ts from the linked project
npx supabase functions deploy   # cache-off-food, delete-account, sync-dining
```

Then put the project URL and publishable (anon) key in `.env` (see [`.env.example`](.env.example), which lists every variable).

**Local stack** (needs Docker)

```bash
npx supabase start              # prints the local URL and keys for .env
npx supabase db reset           # rebuild from migrations + supabase/seed.sql (dev demo account)
npm run db:types:local
```

Schema, RLS policies, and the migration workflow are documented in [docs/SCHEMA.md](docs/SCHEMA.md). SQL checks live in `supabase/tests/` and run against the linked project with `npx supabase db query --linked -f <file>`. Before inviting real users, work through [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

### Development builds (not Expo Go)

Tally runs in an [Expo development build](https://docs.expo.dev/develop/development-builds/introduction/), a debug build of this app with `expo-dev-client`, not in Expo Go. That lets us use native modules (text recognition, HealthKit, notifications) that Expo Go doesn't include. Native projects (`ios/`, `android/`) are generated from `app.json` (Continuous Native Generation) and are gitignored, so never edit them by hand.

| Where                         | First time / after native changes                                       | Day to day                                       |
| ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| iOS Simulator (local)         | `npm run ios` (`npx expo run:ios`)                                      | `npm start`, then open the installed Tally app   |
| iPhone over USB (local)       | `npm run ios:device` (`npx expo run:ios --device`); needs signing       | `npm start`; the phone and Mac on the same Wi-Fi |
| iPhone, built in the cloud    | `npm run build:dev` (EAS, `development` profile), install from the link | `npm start`                                      |
| Simulator, built in the cloud | `npm run build:dev:sim` (EAS, `development-simulator` profile)          | `npm start`                                      |

**After adding a package with native code or changing native config in `app.json` (permissions, plugins, entitlements), run `npm run ios:rebuild`.** It regenerates `ios/` and then builds. Plain `npm run ios` reuses an existing `ios/` folder and won't pick up config plugin changes. EAS builds always start fresh. JavaScript-only changes just need Metro (`npm start`).

EAS profiles in [`eas.json`](eas.json): `development` (dev client, internal distribution), `development-simulator`, `preview` (internal test build of the release app), and `production` (App Store; `npm run build:prod`).

### Scripts

| Script                                 | What it does                                                         |
| -------------------------------------- | -------------------------------------------------------------------- |
| `npm start`                            | Start Metro for the dev build (`expo start --dev-client`)            |
| `npm run ios`                          | Build the dev client and run it in the iOS Simulator                 |
| `npm run ios:device`                   | Build the dev client and run it on a connected iPhone                |
| `npm run ios:rebuild`                  | Regenerate `ios/` from `app.json`, then build (after native changes) |
| `npm run build:dev`                    | EAS cloud build of the dev client for iPhones                        |
| `npm run build:dev:sim`                | EAS cloud build of the dev client for the Simulator                  |
| `npm run build:preview` / `build:prod` | EAS preview (internal) / production builds                           |
| `npm run prebuild:clean`               | Regenerate `ios/` and `android/` from `app.json`                     |
| `npm run lint`                         | ESLint (Expo config + Prettier compatibility)                        |
| `npm run typecheck`                    | `tsc --noEmit`                                                       |
| `npm run format`                       | Format the repo with Prettier                                        |
| `npm test`                             | Jest (jest-expo + React Native Testing Library)                      |
| `npm run db:types`                     | Regenerate database types from the linked Supabase project           |
| `npm run restaurants:extract`          | Parse chains' official nutrition PDFs into reviewable JSON           |
| `npm run restaurants:upload`           | Upsert reviewed restaurant foods (dry run unless `--yes`)            |
| `npm run demo:clear`                   | List (or with `--confirm`, delete) a test account's logs and foods   |

## Releasing (TestFlight)

Production builds run on EAS. The app reads its Supabase URL and key from **EAS environment variables**, not from your local `.env` (which is gitignored and never uploaded). A release build refuses a localhost or LAN Supabase URL.

```bash
# One time
npx eas-cli@latest login
npx eas-cli@latest init                                   # links the project (adds extra.eas.projectId to app.json)
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <publishable-key> --visibility plaintext
npx eas-cli@latest build:version:set --platform ios        # optional: starting build number (EAS manages it remotely)

# Each release: bump expo.version in app.json, then
npx eas-cli@latest build --profile production --platform ios     # same as npm run build:prod
npx eas-cli@latest submit --profile production --platform ios --latest   # upload to App Store Connect / TestFlight
```

Build numbers come from EAS (`appVersionSource: "remote"`, `autoIncrement: true`), so `ios.buildNumber` isn't set in `app.json`. The first `submit` asks you to sign in to App Store Connect and pick or create the app. Work through [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) before inviting external testers.

## Project structure

All app code lives under `src/` and is imported with the `@/` alias (`@/*` → `src/*`).

```
src/
├── app/          Expo Router routes only — thin files that render a screen
├── screens/      Screen components
├── components/   Shared UI components
│   └── ui/       Design-system primitives (Button, Text, Card, …)
├── features/     Feature modules, each owning its hooks, services, and types
│   ├── food/         Food search, custom foods, label scanning
│   ├── logging/      Daily food log and meal labels
│   ├── goals/        Calorie/macro goals and safety rules
│   ├── exercise/     Apple Health sync and burned calories
│   ├── weighins/     Weight entries, trends, reminders
│   ├── onboarding/   First-run survey and initial goal setup
│   └── account/      Auth, profile, settings, data deletion
├── lib/          Supabase client, API adapters, pure utilities
├── hooks/        Hooks shared across features
├── store/        Client state (Zustand)
├── theme/        Design tokens
├── types/        Shared types (incl. generated database types)
└── constants/    App-wide constants
```

## Roadmap

- [x] Skeleton: Expo, TypeScript, Expo Router, tooling, design tokens
- [x] Auth and onboarding, with email confirmation
- [x] Logging: Today screen, timeline, meal labels
- [x] Food database: Open Food Facts, restaurants, dining halls, My Foods, label scan, sharing
- [x] Goals and safety: pace warnings, recommended targets, Help page, end-of-day feedback
- [x] Exercise: Apple Health sync, refuel prompts
- [x] Progress: weigh-ins, trend chart, calendar, streaks
- [x] Numbers-off habit mode, dietary flags
- [ ] Accessibility and dark mode pass
- [ ] TestFlight release (see [Releasing](#releasing-testflight))

## Data sources and licenses

| Source                                                                     | Used for                                                           | License / terms                                                                                                                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Open Food Facts](https://world.openfoodfacts.org)                         | Packaged food search, barcodes, allergen tags                      | Database: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Contents: [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/). Images: CC BY-SA (not used). |
| Chain restaurants' official nutrition PDFs (Wingstop, Chipotle, Five Guys) | Restaurant foods (`scripts/restaurants/`)                          | Published nutrition facts, used for reference. Brand names and trademarks belong to their owners; Tally isn't affiliated with or endorsed by them.                       |
| Purdue University Housing & Food Services menus                            | Dining hall foods ([docs/PURDUE_DINING.md](docs/PURDUE_DINING.md)) | Public menu data from Purdue's menus API. Not affiliated with Purdue.                                                                                                    |

**Open Food Facts attribution.** Food data from Open Food Facts is © Open Food Facts contributors and available under the Open Database License. Tally caches OFF products it looks up in its own database; that cached data remains under the ODbL, and any public use of it must keep this attribution and share it under the same license. The app's code is MIT-licensed and separate from the data.

Nutrition values are as published by each source and can be incomplete or out of date. Allergen information is only ever used to warn, never to say a food is safe.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 Aarav

## Disclaimer

Tally is not medical advice. Talk to a doctor or registered dietitian before making significant changes to your diet or weight.
