# Restaurant nutrition import

Imports chains' **official published nutrition PDFs** into the global food database as
`foods.source = 'restaurant'`, `visibility = 'public'`, no owner. It runs locally with Node and
isn't part of the app.

```
PDF (official URL or local file)
  → lib/pdfRows.ts   text with x/y positions (pdfjs-dist)
  → lib/table.ts     header detection, columns, rows → records (pure, tested)
  → lib/normalize.ts records → foods + food_servings rows, natural keys (pure, tested)
  → lib/validate.ts  4/4/9 calorie check → ready vs flagged (pure, tested)
  → output/<chain>.json   reviewable, committed
  → upload.mts       upserts reviewed items (service role, dry run by default)
```

## 1. Extract (safe; writes JSON only)

```bash
npm run restaurants:extract                 # all chains
npm run restaurants:extract -- wingstop     # one chain
npm run restaurants:extract -- --refresh    # re-download PDFs instead of using .cache/
```

PDFs are cached in `scripts/restaurants/.cache/` (gitignored); the output records each PDF's
URL and SHA-256 so a reviewer can tell exactly what was parsed.

## 2. Review `output/<chain>.json`

- `items`: passed every check and will be uploaded.
- `flagged`: held back, with `reasons`. Typical reasons:
  - **Calories more than 20% off 4/4/9 macros** (protein×4 + carbs×4 + fat×9; tiny items get
    ±10 kcal of slack). Often rounding on very low-calorie items, sometimes a real data error.
  - **Duplicate** of another item with the same natural key but different values (e.g. Five
    Guys lists items per supplier). The first is kept.
  - **Columns didn't line up** with the header, so values were placed by position.

  Compare a flagged item with the PDF, fix its values in the JSON if needed, and set
  `"approved": true` to include it. Items repeated verbatim (Chipotle prints the same table
  for Coke and Pepsi locations) are merged silently.

## 3. Upload (only after review)

Before writing, upload prints a sample of 10 items per chain to eyeball, and skips (⊘) any item
missing calories, protein, carbs, or fat or with no serving in a standard unit (g, oz, ml, cups,
pieces), even if it was approved.

Create `scripts/restaurants/.env.local` from `.env.local.example`, with the project URL and its
**secret (service role) key**. That file is gitignored. Never commit the key or use it in the
app.

```bash
npm run restaurants:upload -- wingstop             # dry run: what would be inserted/updated
npm run restaurants:upload -- wingstop --yes       # write
```

Each item is keyed on `(source, external_id)` with a **stable natural key**
`<chain>:<section>:<item>[:<size>]`, e.g. `wingstop:classic-wings:lemon-pepper`. New items go in
atomically through `insert_food_with_servings`. Re-running updates existing rows: nutrition
changes reset that food's label checks via trigger, and servings are matched by label so past
log entries keep their serving link. Nothing is ever duplicated.

## Adding a chain

1. Find the chain's **official** nutrition PDF (on its own domain or asset host).
2. Add `chains/<id>.ts`:

   ```ts
   export const mychain: ChainConfig = {
     id: 'mychain', // stable: part of every natural key
     name: 'My Chain', // item names become "My Chain – Item"
     source: { url: 'https://…/nutrition.pdf', note: 'US guide, Jan 2027' },
     pages: [2, 3], // optional: pages with the nutrition table
     sections: [
       // optional hints, matched against section titles
       {
         match: /wings/i,
         noun: 'Wings',
         each: 'wing',
         multiples: [{ label: '6 pc', multiplier: 6 }],
       },
       { match: /kids/i, skip: true },
     ],
     cleanName: (n) => n.replace(/\s*\(supplier [a-z]\)/i, ''),
   };
   ```

3. List it in `chains/index.ts`, run extract, and review the JSON. Dry-run the upload, check the
   printed sample against the PDF, then upload with `--yes`. If rows come out wrong,
   capture a few rows into `__fixtures__/rows.ts` and add a test to `__tests__/pipeline.test.ts`.

## Current chains

| Chain     | Source                                                       | Note                                                    |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| Wingstop  | Nutritional guide on Wingstop's asset host                   | File name suggests 2018; check for a newer guide first. |
| Chipotle  | US Nutrition Facts, March 2025 (chipotle.com)                | Pages 2–3 (page 1 is a calorie-only menu).              |
| Five Guys | US Nutrition & Allergen Guide, September 2026 (fiveguys.com) | Allergen columns ignored; supplier variants flagged.    |
