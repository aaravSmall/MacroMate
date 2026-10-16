# Architecture

Tally is an Expo / React Native app written in strict TypeScript, backed by Supabase (Postgres + Auth). This doc covers how code is layered, where state lives, and where the important rules are enforced.

## Layers

```
routes  →  screens  →  feature hooks  →  services  →  Supabase / external APIs
src/app    src/screens  src/features/*/hooks  src/features/*/services   src/lib
```

| Layer              | Location                           | Responsibility                                                                                                           | May import                              |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| **Routes**         | `src/app/`                         | Expo Router files only. Each one renders a screen and has no logic.                                                      | screens                                 |
| **Screens**        | `src/screens/`                     | Compose UI from components and feature hooks. Handle layout and navigation.                                              | components, feature hooks, store, theme |
| **Feature hooks**  | `src/features/<feature>/hooks/`    | TanStack Query queries/mutations and feature-level view logic.                                                           | services, store, pure feature logic     |
| **Services**       | `src/features/<feature>/services/` | Typed functions that read and write data. They map DB rows to domain types and have no React.                            | `src/lib`                               |
| **Infrastructure** | `src/lib/`                         | The Supabase client, external API adapters (Open Food Facts, restaurant data, label OCR, HealthKit), and pure utilities. | third-party SDKs                        |

Rules:

- Dependencies point one way: down the table. Services never import hooks or components, and `src/lib` never imports from `features`.
- **All Supabase access goes through `src/lib` and feature services.** Screens and components never call `supabase` directly.
- Each feature module owns its hooks, services, components, and types. Code shared by two or more features moves up to `src/hooks`, `src/components`, `src/lib`, or `src/types`.
- Generated Supabase database types live in `src/types/`. Services convert rows to domain types so the rest of the app doesn't depend on table shapes.

A typical feature module:

```
src/features/logging/
├── components/      Feature-specific UI (e.g. TimelineRow)
├── hooks/           useDayLog, useAddEntry, …
├── services/        entries.ts (Supabase reads/writes)
├── logic/           Pure functions (e.g. suggestMealLabel)
├── types.ts
└── index.ts         Public API of the feature
```

## State strategy

| Kind of state             | Where                  | Examples                                                                     |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| **Server state**          | TanStack Query         | Day log, foods, goals, weigh-ins, profile                                    |
| **UI / session state**    | Zustand (`src/store/`) | Selected date, numbers-off mode, expanded summary card, in-progress add flow |
| **Local component state** | `useState`             | Form inputs, transient toggles                                               |

- Don't copy server data into Zustand; read it through query hooks.
- Query keys are defined per feature (e.g. `['entries', userId, date]`) and invalidated after mutations.
- Mutations use optimistic updates where it improves feel (adding or deleting an entry), and roll back on error.
- The auth session lives in **React context** (`AuthProvider` / `useAuth()` in `src/features/auth`), not Zustand.

### Why auth uses context, not Zustand

Supabase Auth already owns the session: it persists it to AsyncStorage, refreshes tokens, and emits `onAuthStateChange`. The app only needs to mirror that one value and re-render the tree when it changes. That's what context is for:

- **One source of truth.** The provider subscribes once and holds the session Supabase reports. A Zustand store would be a second copy that could drift if something wrote to it directly.
- **Low-frequency updates.** The session changes only on sign-in, sign-out, and token refresh, so context re-renders cost nothing meaningful. Zustand's selective subscriptions buy nothing here.
- **Lifecycle tied to the tree.** The subscription is set up and torn down with the provider, which also makes tests easy: wrap a component in a provider with a fake session.

Zustand stays reserved for UI/session state that the app itself owns and updates often.

### Root gate

`src/app/_layout.tsx` decides which route group is reachable, using `Stack.Protected`:

| State                          | Destination                   |
| ------------------------------ | ----------------------------- |
| Session still restoring        | Splash screen stays up        |
| No session                     | `(auth)`                      |
| Session, onboarding incomplete | `(onboarding)`                |
| Session, onboarding complete   | `(tabs)` and the modal routes |

## Data flow: logging a food

```
Add (+) tab
  └─ FoodSearchScreen
       └─ useFoodSearch(query)                         features/food/hooks
            └─ searchFoods()                           features/food/services
                 ├─ Supabase: global foods + My Foods  src/lib/supabase
                 └─ Open Food Facts adapter            src/lib/openFoodFacts
  user picks a food + serving
       └─ useAddEntry().mutate(entry)                  features/logging/hooks
            ├─ suggestMealLabel(timestamp)             features/logging/logic (pure)
            ├─ optimistic update of ['entries', userId, date]
            └─ createEntry(entry)                      features/logging/services
                 └─ Supabase insert into entries       src/lib/supabase
  on success: invalidate day log + daily totals
       └─ TodayScreen re-renders summary card + timeline
```

1. The user searches. `useFoodSearch` debounces the query and calls the food service, which merges results from the user's My Foods, the shared global foods table, and Open Food Facts.
2. The user picks a serving. The screen builds an entry draft with the timestamp set to now and a meal label suggested by a pure function. The user can edit both.
3. `useAddEntry` optimistically adds the entry to the cached day log and calls `createEntry`, which inserts the row through the Supabase client in `src/lib`.
4. On success the day-log queries are invalidated, so totals (eaten / remaining) recompute. On error the optimistic update is rolled back and the user sees an error.

Label scanning follows the same path, with one extra step first: the photo goes through the OCR adapter in `src/lib`, which pre-fills the create-food form. The user confirms the food before it's saved.

## Safety rules

The safety rules from [PRODUCT.md](PRODUCT.md#safety-rules) live in **`src/features/goals/logic/`** as **pure functions** with no React, no I/O, and no Supabase:

- `calculateBudget(profile, goal, burned)` — daily calorie budget and macro targets
- `assessPace(goal)` — returns a caring warning for loss > 2 lb/week or gains that are too fast
- `applyCalorieFloor(budget, profile)` — returns the floor as a recommendation (the floor value is never shown)
- `evaluateDay(totals, budget)` — near-goal celebration vs. under-goal nudge, never praise for undereating

Why this approach:

- **Unit tested**: every rule has Jest tests, including edge cases around the thresholds. Changes to these functions need tests.
- **Single source of truth**: screens and hooks call these functions instead of reimplementing thresholds.
- **Warnings, not blocks**: functions return warning objects (severity, message key, help link) that the UI renders. They never throw or reject a goal.

## Privacy

- **Never log PII**: no weights, food entries, emails, or health data in `console` or analytics.
- Supabase Row Level Security restricts every user-owned table to `auth.uid()`.
- Account deletion removes all user rows. Shared foods are detached from the user and anonymized.
- HealthKit data is read only for exercise / active energy and is used only to adjust the budget.
