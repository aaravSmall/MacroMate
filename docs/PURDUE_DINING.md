# Purdue Dining menus

Purdue's residential dining menus come from the **Purdue HFS menus API**, the same backend that
[dining.purdue.edu/menus](https://dining.purdue.edu/menus/) and the Purdue Mobile Menus app use.
We read its JSON API; we never scrape HTML.

## How the endpoints were found

The menus site is a single-page app (`/menus/static/main-*.js`). Its bundle configures
`baseUrl = https://api.hfs.purdue.edu/menus/` and calls:

- REST (v2): `v2/locations`, `v2/locations/{name}/{YYYY-MM-DD}`, `v2/items/{id}`
- GraphQL (v3): `v3/GraphQL` with `getStartLocations` and `getLocationMenu($name, $date)`

Both are **public: no auth, no API key**. Checked on 2026-10-18 with plain requests and a
descriptive `User-Agent`. We use the v2 REST endpoints: they're simpler and the only
place item nutrition is exposed (the GraphQL menu query returns names, traits and ids, not
nutrition).

## Endpoints

Base: `https://api.hfs.purdue.edu/menus/v2`

### Locations: `GET /locations`

```json
{
  "Types": ["Dining Courts", "Quick Bites", "On-the-GO!"],
  "Location": [
    { "LocationId": "WILY", "Name": "Wiley", "FormalName": "Wiley Dining Court",
      "Type": "Dining Courts", "Address": { … }, "NormalHours": [ … ], "UpcomingMeals": [ … ] }
  ]
}
```

12 locations (dining courts, Quick Bites, On-the-GO!). `Name` is what the menu endpoint takes.

### Menu by date: `GET /locations/{Name}/{YYYY-MM-DD}`

Name is URL-encoded (e.g. `Pete's%20Za%20at%20Tarkington%20Hall`).

```json
{
  "Location": "Earhart", "Date": "10/19/2026", "IsPublished": true, "Notes": "…",
  "Meals": [
    { "ID": "…", "Name": "Breakfast", "Order": 0, "Status": "Open", "Type": "Breakfast",
      "Stations": [
        { "Name": "Granite Grill",
          "Items": [
            { "ID": "<item uuid>", "Name": "Scrambled Eggs", "IsVegetarian": true,
              "NutritionReady": true,
              "Allergens": [ { "Name": "Eggs", "Value": true }, { "Name": "Milk", "Value": false }, … ] }
          ] } ] } ]
}
```

- Meal → station → item. Closed meals have no stations.
- `NutritionReady: false` items ("Salad Bar", "Baked Potato Bar") have no nutrition and are skipped.
- On a Monday, the 12 locations list ~700 items (≈310 unique).

### Item detail: `GET /items/{id}`

```json
{
  "ID": "f66e97b7-…", "Name": "Chicken Fajitas", "IsVegetarian": false, "NutritionReady": true,
  "Ingredients": "Chicken Fajita Strip (Chicken Breast Meat With Rib Meat, …",
  "Nutrition": [
    { "Name": "Serving Size", "LabelValue": "Cup" },
    { "Name": "Calories", "Value": 216.2769, "LabelValue": "216" },
    { "Name": "Total fat", "Value": 7.6176, "LabelValue": "8g", "DailyValue": "12%" },
    { "Name": "Calcium", "Value": 16.4235, "LabelValue": null, "DailyValue": "2%" }
  ],
  "Allergens": [ { "Name": "Gluten", "Value": true }, { "Name": "Vegan", "Value": false }, … ]
}
```

Nutrients seen: Serving Size, Calories, Calories from fat, Total fat, Saturated fat,
Cholesterol, Sodium, Total Carbohydrate, Sugar, Added Sugar, Dietary Fiber, Protein, Calcium
(mg), Iron (mg). `Value` is precise; `LabelValue` is the rounded label text ("less than 1 g").
The serving is a name only ("Cup", "1/2 Cup", "4 oz serving", "Each", "Hot Dog", "8 Cut
Serving"); no grams.

Saved responses (trimmed) are the test fixtures:
`supabase/functions/sync-dining/providers/__fixtures__/purdue-*.json`.

## Mapping (`providers/purdueMapping.ts`)

| Purdue                                                                                                     | MacroMate                                                                                        |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| item `ID`                                                                                                  | `foods.provider = 'purdue'`, `provider_item_id`, `external_id = purdue:<ID>`                     |
| `Name`                                                                                                     | `foods.name`; brand `Purdue Dining`; `source = 'dining_hall'`, public, no owner                  |
| Serving Size label                                                                                         | one serving, e.g. `1 cup`, `1/2 cup`, `4 oz`, `1 each`, `1 slice (1/8)`; nutrition per 1 serving |
| Calories, Total fat, Saturated fat, Cholesterol, Sodium, Total Carbohydrate, Dietary Fiber, Sugar, Protein | columns (from `Value`, rounded to 0.01; label text as fallback)                                  |
| Added Sugar, Calcium, Iron, (Trans fat, Potassium, Vitamin D if present)                                   | `micros` (`added_sugar_g`, `calcium_mg`, …)                                                      |
| Any other nutrient with a unit in its label                                                                | `micros` as `<name>_<unit>`, and reported as unmapped                                            |
| Allergens with `Value: true`                                                                               | `foods.allergens` (lowercase); Vegetarian/Vegan go to `foods.diet_tags`                          |
| `Ingredients`                                                                                              | `foods.ingredients`                                                                              |

Each Purdue item is **one public food reused across days and locations**. Daily menus live in
`dining_menu_items` (location, date, meal, station → food).

## Sync (`supabase/functions/sync-dining`)

- **Schedule:** pg_cron `sync-dining-daily` at 09:00, 09:10, 09:20, 09:30 UTC (5:00–5:30 am
  EDT; 4:00–4:30 am EST), calling the function through pg_net with the `x-cron-secret` from
  Vault (`dining_cron_secret`, `dining_sync_url`).
- **Who can call it:** the cron secret or the service-role/secret key only (`verify_jwt` is off,
  since neither is a user JWT; the handler checks).
- **What it does:** locations → menus for today + 2 days (Purdue time,
  America/Indiana/Indianapolis) → item details only for **new items or ones not refreshed in 7
  days** → `upsert_provider_food` → menu rows diffed per location/date.
- **Time budget:** item fetching stops after ~110 s (Edge Functions have a wall-clock limit). A
  fresh 3-day window is ~480 items, so the first sync takes two runs; daily runs after that
  fetch only new items and finish in ~15 s. Menus with unfetched items are merged (no
  deletions) until complete.
- **Politeness:** one request at a time, 300 ms between requests, User-Agent `MacroMate/0.1
(calorie tracker; daily menu sync; https://github.com/aaravSmall/MacroMate)`, retries on
  429/5xx with exponential backoff (1 s, 2 s, 4 s).
- **Menu changes:** rows no longer on a menu are removed from `dining_menu_items`; foods are
  never deleted, so past log entries keep their food link (and always keep their own snapshot).
- **Idempotent:** a second run fetches nothing and changes nothing.

Manual run (as the cron does it, without exposing the secret):

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'dining_sync_url'),
  headers := jsonb_build_object('Content-Type', 'application/json',
    'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'dining_cron_secret')),
  body := '{}'::jsonb, timeout_milliseconds := 150000);
-- then: select status_code, content from net._http_response order by id desc limit 1;
```

## Adding another campus

Write `providers/<campus>.ts` implementing `DiningProvider` (`providers/types.ts`) with a pure
mapping module and fixtures, register it in `sync-dining/index.ts` (`PROVIDERS`) and in the
app's `src/features/dining/providers.ts` (label + time zone).
