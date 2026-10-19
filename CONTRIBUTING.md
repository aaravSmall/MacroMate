# Contributing to Tally

Thanks for your interest! Tally is a free, open-source calorie tracker, and contributions of all sizes are welcome — bug reports, docs fixes, and features.

Before starting on a larger change, please open an issue to discuss it. Read [docs/PRODUCT.md](docs/PRODUCT.md) (especially the design principles and safety rules) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first.

## Setup

1. Install Node.js 20+, Xcode (with an iOS Simulator), and CocoaPods.
2. Fork and clone the repo, then:

   ```bash
   npm install
   cp .env.example .env   # add your own Supabase URL and anon key
   npm run ios            # builds the dev client and runs it in the Simulator
   ```

3. The app runs in a development build, not Expo Go. After the first `npm run ios`, `npm start` is enough for JavaScript changes; run `npm run ios:rebuild` after adding a native package or changing native config in `app.json` (plain `npm run ios` reuses the generated `ios/` folder). See the README for physical-device and EAS builds.

Add packages with `npx expo install <package>` rather than `npm install`, so versions stay compatible with the Expo SDK.

## Branches

Branch off `main` and use a short, descriptive name prefixed with the change type:

```
feat/label-scanner
fix/timeline-sort-order
docs/architecture-data-flow
```

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`. Scopes usually match a feature module, e.g. `feat(logging): add meal label suggestions`.

Keep the summary in the imperative mood ("add", not "added") and under ~72 characters.

## Checks

Run these before pushing. All of them must pass:

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Jest
npm run format      # Prettier (or `npm run format:check` to verify only)
```

## Secrets and data

- Never commit keys. `.env*` files are gitignored except the `.example` templates; the app only
  ever gets the public URL and publishable/anon key. The service role key is for local admin
  scripts and Edge Functions only.
- Database changes go in a new migration under `supabase/migrations/` (never edit an applied
  one), with RLS on every table. See [docs/SCHEMA.md](docs/SCHEMA.md).
- Food data from Open Food Facts is under the ODbL; keep its attribution (see the README).

## Pull request checklist

- [ ] The PR is focused on one change and links any related issue
- [ ] `npm run lint`, `npm run typecheck`, and `npm test` pass
- [ ] Code is formatted with Prettier
- [ ] New logic has tests — safety rules and goal math must be unit tested
- [ ] No `any`, and no personal data (weights, food logs, emails) written to logs
- [ ] UI changes include a screenshot or screen recording
- [ ] Changes respect the [design principles](docs/PRODUCT.md#design-principles) — no celebrating undereating, no red/green judgment
- [ ] Docs are updated if behavior or setup changed

## Code of conduct

Be kind and constructive. This is a health-adjacent app, so please be especially thoughtful in discussions about weight, food, and body image.
