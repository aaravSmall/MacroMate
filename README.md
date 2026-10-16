# Tally

A free, open-source, iPhone-first calorie tracker. Every feature is free — no paywall.

> "Tally" is a placeholder display name. It lives in one place: `expo.name` in `app.json`.

## Stack

- [Expo](https://expo.dev) (SDK 58) + [Expo Router](https://docs.expo.dev/router/introduction/)
- React Native + TypeScript (strict)
- [Supabase](https://supabase.com) backend

## Getting started

```bash
npm install
cp .env.example .env   # fill in Supabase values
npm start              # then press i for the iOS simulator
```

## Scripts

| Script              | What it does                     |
| ------------------- | -------------------------------- |
| `npm start`         | Start the Expo dev server        |
| `npm run ios`       | Start and open the iOS simulator |
| `npm run lint`      | ESLint (Expo config + Prettier)  |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm run format`    | Format the repo with Prettier    |
| `npm test`          | Jest (jest-expo + RNTL)          |

## Project structure

All app code lives under `src/` and is imported via the `@/` alias (`@/*` → `src/*`).

```
src/
  app/          Expo Router routes only (thin files that import screens)
  screens/      Screen components
  components/   Shared UI components (ui/ for primitives)
  features/     Feature modules: food, logging, goals, exercise, weighins, onboarding, account
  lib/          Supabase client, API adapters, utils
  hooks/        Shared hooks
  store/        Client state
  theme/        Design tokens
  types/        Shared types
  constants/    App-wide constants
```

Each folder has a short README describing what belongs there.
