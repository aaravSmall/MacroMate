# Architecture

MacroMate is an Expo / React Native app written in strict TypeScript, backed by Supabase (Postgres + Auth). This doc covers how code is layered, where state lives, and where the important rules are enforced.

## Runtime

The app ships as a native iOS app built from `app.json` by Expo's Continuous Native Generation. During development it runs in a **development build** (`expo-dev-client`) rather than Expo Go, so native modules such as on-device text recognition, HealthKit, and notifications can be used. Native projects are generated (`npx expo run:ios`, `eas build`), never edited by hand. Builds are defined in `eas.json`: `development` / `development-simulator` (dev client), `preview` (internal), and `production`. The README lists the commands.

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
├── hooks/           useDayLogs, useAddLog, …
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
- All query keys live in `src/lib/queryKeys.ts` (e.g. `queryKeys.logs.day('2026-10-16')`) and are invalidated after mutations. The whole cache is cleared when the signed-in user changes, so keys don't include the user id.
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
                 ├─ Supabase: foods (public + own)     src/lib/supabase
                 └─ Open Food Facts adapter            src/lib/openFoodFacts
  user picks a food + serving, taps Log
       ├─ (live OFF result only) useCacheOpenFoodFactsFood(code)
       │    └─ Edge Function cache-off-food            supabase/functions
       │         ├─ fetch product from OFF (server-side)
       │         └─ insert foods + food_servings (service role)
       └─ useAddLog().mutate(input)                    features/logging/hooks
            ├─ suggestMealType(timestamp)              features/logging/logic (pure)
            ├─ optimistic update of queryKeys.logs.day(date)
            └─ addLog(input)                           features/logging/services
                 └─ Supabase insert into entries       src/lib/supabase
  on success: invalidate day log + daily totals
       └─ TodayScreen re-renders summary card + timeline
```

1. The user searches. `useFoodSearch` debounces the query and calls the food service. It searches `foods` (public foods, including Open Food Facts products any user has already cached, plus the user's own, via RLS) and tops up with live Open Food Facts results when there are few matches. Live results already cached are dropped by `external_id`. The screen shows the user's own foods as "My Foods".
2. The user picks a serving and amount. If the food is a live OFF result (an `off:` id), the app first calls the `cache-off-food` Edge Function with just the barcode, showing a loading state. The function returns the stored food, creating it if needed (see below), and the app keeps the same-size serving. If caching fails, the user sees a friendly message and nothing is logged. The meal is suggested from the time of day by a pure function, and the user can change it. For a public food someone else added (cached OFF foods included, since they have no owner), the app asks "Does this match your label?" and upserts the answer into `food_verifications`.
3. `useAddLog` optimistically adds the entry to the cached day log and calls `addLog`. That inserts into `log_entries` a snapshot computed by `buildLogInsert`: food value × serving multiplier × quantity, plus `local_date` in the user's timezone.
4. On success the day log and that day's `daily_totals` are invalidated, so the summary (eaten / remaining) refreshes from the view. On error the optimistic update is rolled back and the user sees an error.

**Caching Open Food Facts products.** Clients can't insert global foods, so `supabase/functions/cache-off-food` does it. Callers must be signed in: `verify_jwt` is on, and the handler also verifies the user's session JWT, because the gateway admits publishable-key-only requests. The function:

- takes only `{ code }` (4–14 digits)
- returns the existing `foods` row if that product is already cached
- otherwise fetches the product from OFF itself (client nutrient values are never trusted) and maps it with the pure, unit-tested `offMapping.ts` (per 100 ml for drinks, per 100 g otherwise)
- inserts the food and its servings atomically through the `insert_food_with_servings` RPC (service role only); if another request cached the same product first, the RPC returns that row

Every logged food therefore has a real `food_id`. `buildLogInsert` refuses `off:` ids.

Label scanning follows the same path, with one extra step first: the photo goes through the OCR adapter in `src/lib`, which pre-fills the create-food form. The user confirms the food before it's saved.

## Safety rules

The safety rules from [PRODUCT.md](PRODUCT.md#safety-rules) live in **`src/features/goals/logic/`** as **pure functions** with no React, no I/O, and no Supabase:

- `calculateBMR` / `calculateTDEE`: Mifflin-St Jeor with named activity multipliers, metric or imperial input
- `calculateDailyTarget({ profile, goalType, weeklyRate })`: TDEE ± ~3,500 kcal per lb, with the calorie floor applied and flagged (`floorApplied`)
- `assessPace(weeklyRate, goalType)`: `'ok' | 'caution'` for loss > 2 lb/week or gain above the configured threshold, never a block
- `assessDayStatus(eaten, target)` and `feedbackForDayStatus(status)`: near-goal celebration vs. under-goal nudge, never praise for undereating

Thresholds live in `src/constants/safety.ts`, and user-facing wording in `src/features/goals/copy.ts`. `CareNotice` (`src/features/goals/components`) renders cautions in a calm style with a link to Help & resources.

Why this approach:

- **Unit tested**: every rule has Jest tests, including edge cases around the thresholds. Changes to these functions need tests.
- **Single source of truth**: screens and hooks call these functions instead of reimplementing thresholds.
- **Warnings, not blocks**: functions return warning objects (severity, message key, help link) that the UI renders. They never throw or reject a goal.

## Privacy

- **Never log PII**: no weights, food entries, emails, or health data in `console` or analytics.
- Supabase Row Level Security restricts every user-owned table to `auth.uid()`.
- Account deletion runs in the `delete-account` Edge Function (service role, caller-only): deleting the auth user cascades all user rows, a trigger removes private foods, and public foods stay with `owner_id` set to null.
- HealthKit data is read only for exercise / active energy and is used only to adjust the budget.
