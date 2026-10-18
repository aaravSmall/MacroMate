@AGENTS.md

# Tally — context for Claude Code

Tally is a free, open-source, iPhone-first calorie tracker. Every feature is free; there is no paywall. "Tally" is a placeholder name, set only in `app.json` → `expo.name`.

Read before feature work: [docs/PRODUCT.md](docs/PRODUCT.md) (decisions, screens, safety rules) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (layers, state, data flow).

## Stack

Expo (SDK 58) / React Native, Expo Router, TypeScript (strict), Supabase (Postgres + Auth), TanStack Query (server state), Zustand (UI/session state), Open Food Facts. Tests use Jest (jest-expo) and React Native Testing Library.

## Running the app

The app runs in an **Expo development build** (`expo-dev-client`), **not Expo Go**, so native modules can be added. `ios/` and `android/` are generated (CNG) and gitignored; configure native behavior in `app.json` and config plugins.

```bash
npm run ios            # npx expo run:ios: build the dev client, install in the Simulator, start Metro
npm run ios:device     # npx expo run:ios --device: same, on a USB-connected iPhone (needs signing)
npm start              # npx expo start --dev-client: Metro only, for JS changes once the build is installed
npm run build:dev      # EAS cloud dev build for iPhones (profile "development")
npm run build:dev:sim  # EAS cloud dev build for the Simulator (profile "development-simulator")
```

After adding a package with native code or changing native config (plugins, permissions, entitlements in `app.json`), run `npm run ios:rebuild` (`expo prebuild --platform ios --clean && expo run:ios`). Plain `npm run ios` reuses the existing generated `ios/` and silently misses config plugin changes. EAS profiles live in `eas.json` (development, development-simulator, preview, production).

## Folder conventions

- `src/app/`: routes only. Thin files that render a screen from `src/screens/`.
- `src/screens/`: screen components.
- `src/components/`: shared UI; `ui/` holds primitives.
- `src/features/<name>/`: feature modules (food, logging, goals, exercise, weighins, onboarding, account). Each owns its `hooks/`, `services/`, `logic/`, `components/`, and `types.ts`.
- `src/lib/`: Supabase client, external API adapters, pure utils.
- `src/hooks/`, `src/store/` (Zustand), `src/theme/` (tokens), `src/types/`, `src/constants/`.
- `supabase/`: migrations, Edge Functions (`functions/`, Deno; pure helpers are Jest-tested), SQL checks (`tests/`).
- `scripts/`: local Node tooling, not shipped (e.g. `scripts/restaurants/` nutrition import; own tsconfig).
- Import with the `@/` alias (`@/*` → `src/*`), not long relative paths.

## Coding rules

- Strict TypeScript. **No `any`**; use `unknown` and narrow it.
- Functional components and hooks only.
- Feature modules own their hooks and services. Promote code to shared folders only when two or more features use it.
- **All Supabase access goes through `src/lib` and feature services.** Never call Supabase from screens or components.
- Server state goes in TanStack Query and UI/session state in Zustand. Don't duplicate server data in Zustand.
- Safety rules and goal math are pure functions in `src/features/goals/logic/` and must have unit tests.
- **Never log PII**: no weights, food logs, emails, or health data in logs.
- Follow the design principles: never celebrate undereating, no red/green calendar judgment, and warnings are caring, not blocking.
- Add packages with `npx expo install`, not `npm install`.
- Use design tokens from `@/theme` instead of hard-coded colors and spacing.

## Before committing

```bash
npm run lint
npm run typecheck
npm test
npm run format
```

All must pass. Fix failures; don't suppress them.

## Workflow

After each task: run the checks above, commit to `main` with a [Conventional Commit](https://www.conventionalcommits.org/) message (`feat(logging): …`, `fix: …`, `docs: …`, `chore: …`), and push to `origin main`.
