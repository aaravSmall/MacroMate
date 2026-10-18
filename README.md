# Tally

[![CI](https://github.com/aaravSmall/MacroMate/actions/workflows/ci.yml/badge.svg)](https://github.com/aaravSmall/MacroMate/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**A free, open-source calorie tracker — every feature free, no paywall.**

> "Tally" is a placeholder name. The display name lives in one place: `expo.name` in [`app.json`](app.json).

## Why

Most popular calorie trackers lock their most useful features — barcode/label scanning, macro goals, exercise sync — behind a subscription. Tally exists out of frustration with that. It's built first for my own daily use and as a portfolio project, but it's open to anyone who wants a full-featured tracker without a paywall.

## Features

| Feature                                                                                                            | Status      |
| ------------------------------------------------------------------------------------------------------------------ | ----------- |
| Accounts with cloud sync                                                                                           | In progress |
| Food logging, 3 ways: search the food database, create your own food, or scan a nutrition label photo to auto-fill | In progress |
| Global food database (Open Food Facts + restaurant nutrition)                                                      | In progress |
| Private "My Foods", optionally shareable to the global database                                                    | In progress |
| Timestamped entries with auto-suggested, editable meal labels                                                      | In progress |
| Calories, protein, carbs, fat + micronutrients from the label                                                      | In progress |
| Goals for losing, maintaining, or gaining weight                                                                   | In progress |
| Apple Health exercise sync (burned calories add to your daily budget)                                              | Planned     |
| Weigh-ins with configurable reminders                                                                              | In progress |
| Logging streaks                                                                                                    | In progress |
| Neutral logging calendar                                                                                           | In progress |
| Optional "numbers off" habit mode                                                                                  | In progress |
| Help & resources page                                                                                              | In progress |

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

### Development builds (not Expo Go)

Tally runs in an [Expo development build](https://docs.expo.dev/develop/development-builds/introduction/), a debug build of this app with `expo-dev-client`, not in Expo Go. That lets us use native modules (text recognition, HealthKit, notifications) that Expo Go doesn't include. Native projects (`ios/`, `android/`) are generated from `app.json` (Continuous Native Generation) and are gitignored, so never edit them by hand.

| Where                         | First time / after native changes                                       | Day to day                                       |
| ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| iOS Simulator (local)         | `npm run ios` (`npx expo run:ios`)                                      | `npm start`, then open the installed Tally app   |
| iPhone over USB (local)       | `npm run ios:device` (`npx expo run:ios --device`); needs signing       | `npm start`; the phone and Mac on the same Wi-Fi |
| iPhone, built in the cloud    | `npm run build:dev` (EAS, `development` profile), install from the link | `npm start`                                      |
| Simulator, built in the cloud | `npm run build:dev:sim` (EAS, `development-simulator` profile)          | `npm start`                                      |

Rebuild (`npm run ios` or an EAS build) whenever you add a package with native code or change native config in `app.json`. JavaScript-only changes just need Metro (`npm start`). If native config gets out of sync, run `npm run prebuild:clean` to regenerate `ios/`.

EAS profiles in [`eas.json`](eas.json): `development` (dev client, internal distribution), `development-simulator`, `preview` (internal test build of the release app), and `production` (App Store; `npm run build:prod`).

### Scripts

| Script                                 | What it does                                              |
| -------------------------------------- | --------------------------------------------------------- |
| `npm start`                            | Start Metro for the dev build (`expo start --dev-client`) |
| `npm run ios`                          | Build the dev client and run it in the iOS Simulator      |
| `npm run ios:device`                   | Build the dev client and run it on a connected iPhone     |
| `npm run build:dev`                    | EAS cloud build of the dev client for iPhones             |
| `npm run build:dev:sim`                | EAS cloud build of the dev client for the Simulator       |
| `npm run build:preview` / `build:prod` | EAS preview (internal) / production builds                |
| `npm run prebuild:clean`               | Regenerate `ios/` and `android/` from `app.json`          |
| `npm run lint`                         | ESLint (Expo config + Prettier compatibility)             |
| `npm run typecheck`                    | `tsc --noEmit`                                            |
| `npm run format`                       | Format the repo with Prettier                             |
| `npm test`                             | Jest (jest-expo + React Native Testing Library)           |

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

Checked items exist in bare-bones form; polish comes in later milestones.

**1. Skeleton** ✅ (v0.1.0)

- [x] Expo + TypeScript + Expo Router project
- [x] Lint, format, typecheck, and test tooling
- [x] Project docs
- [x] Tab navigation shell (Today, Add, Progress, Account)
- [x] Design tokens and UI primitives
- [x] Supabase client and environment config

**2. Auth & Onboarding**

- [x] Sign up / sign in with Supabase Auth
- [x] Onboarding survey
- [x] Initial goal calculation

**3. Logging**

- [x] Today screen: summary card + food timeline
- [x] Add, edit, and delete entries
- [x] Auto-suggested meal labels

**4. Food DB**

- [x] Open Food Facts search
- [ ] Restaurant nutrition data
- [ ] My Foods (create, edit, optionally share)
- [ ] Nutrition label photo scan to auto-fill

**5. Goals & Safety**

- [x] Lose / maintain / gain goals with macro targets
- [x] Pace warnings and the help & resources page
- [x] Near-goal and under-goal feedback

**6. Exercise sync**

- [ ] Apple Health integration (dev build)
- [ ] Burned calories added to the daily budget

**7. Progress**

- [ ] Weigh-ins, trends, and reminders
- [x] Logging streaks
- [x] Neutral logging calendar

**8. Polish / TestFlight**

- [ ] "Numbers off" habit mode
- [ ] Accessibility and dark mode pass
- [x] Account deletion
- [ ] TestFlight release

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 Aarav

## Disclaimer

Tally is not medical advice. Talk to a doctor or registered dietitian before making significant changes to your diet or weight.
