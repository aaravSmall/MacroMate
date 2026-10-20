# Product spec

This document records MacroMate's product decisions. If a change conflicts with something here, update this doc in the same PR (and explain why).

## Vision

A full-featured calorie tracker where every feature is free — no paywall, no premium tier. It's built for personal daily use and as a portfolio project, and it's open source for anyone to use or contribute to.

## Design principles

1. **Encourage healthy choices, don't force them.** Defaults and suggestions nudge toward healthy habits; the user always has the final say.
2. **Never celebrate undereating.** Eating far below budget is never shown as an achievement: no confetti, streak bonuses, or praise for it.
3. **No red/green judgment on the calendar.** The calendar shows whether a day was logged. It never colors days as good or bad based on calories.
4. **Safety warnings are caring, not blocking.** When something looks risky, explain why kindly and point to help. Don't stop the user from proceeding.

## Features

### Accounts and sync

- Email-based accounts via Supabase Auth; all data syncs to the cloud.
- **Account deletion wipes all of the user's data**: entries, foods, weigh-ins, goals, and the profile. Shared foods that others may depend on are kept but detached from the user and anonymized.

### Food logging (3 ways)

1. **Search the food database**: global foods (see below) plus the user's own My Foods.
2. **Create your own food**: enter name, serving size, and nutrition manually.
3. **Scan a nutrition label photo**: take a photo (or pick one) of a printed Nutrition Facts panel. Text recognition runs on the device (Apple Vision on iOS); it's free and nothing is uploaded. The photo isn't saved: the app deletes its temporary copy once the text is read. A pure parser (`features/food/logic/labelParser.ts`) reads serving size (with grams/ml), servings per container, calories, fat, saturated and trans fat, cholesterol, sodium, carbs, fiber, total and added sugars, protein, and any printed vitamin D, calcium, iron, potassium, magnesium, and zinc. It ignores %DV columns and repairs common OCR misreads. The create-food form opens prefilled (source `label_scan`), with low-confidence or missing fields highlighted for the user to check against the package. The name is always required.
   - **Rule: printed labels only.** MacroMate never estimates calories from a photo of a meal; those estimates aren't reliable. If a photo doesn't look like a Nutrition Facts panel, the user is told so and can enter the food manually.

MacroMate deliberately does **not** estimate calories from a photo of a meal. That estimate is unreliable, and presenting it as data would undermine trust in every other number.

### Food database

- **Global database**: Open Food Facts for packaged foods, plus restaurant nutrition data.
- **My Foods**: private foods a user creates. They can optionally **share** a food to the global database for everyone to use.

### Entries

- Every entry has a **timestamp** (defaulting to now, editable).
- Each entry gets a **meal label** (Breakfast, Lunch, Dinner, Snack) auto-suggested from the time of day. The user can change it.
- Tracked nutrients: **calories, protein, carbs, fat**, plus any **micronutrients** present on the label (e.g. fiber, sugar, sodium).

### Goals

- Goal types: **lose**, **maintain**, or **gain** weight.
- The daily calorie budget comes from the onboarding survey and the chosen pace. Macro targets come from the budget.
- Exercise synced from Apple Health **adds burned calories to the daily budget**.

### Exercise

- Apple Health sync for workouts and active energy (HealthKit, read-only; connect or disconnect in Settings). Every source that writes workouts to Health is included. Sync runs on open/foreground and pull-to-refresh on Today, upserts by HealthKit id, and removes workouts deleted in Health within the synced window. After a synced workout, Today shows a gentle, dismissible refuel note once per workout.
- Exercise appears as its own section on the Today screen.

### Weigh-ins

- Manual weigh-in entries with a trend view.
- Configurable reminders: **default weekly on Sunday morning**. The user can choose weekly, biweekly, or monthly, and pick the day and time.

### Habit features

- **Logging streaks**: consecutive days with at least one entry. Streaks reward the act of logging, never the number of calories.
- **Neutral logging calendar**: shows which days were logged, with no good/bad coloring.
- **"Numbers off" habit mode** (optional): hides calorie and macro numbers so the user can focus on the habit of logging and on food choices. Data is still recorded.

### Help & resources

A page with information about healthy weight change, how to talk to a doctor, and eating-disorder support resources. Safety warnings link here.

## Screens

Bottom tabs: **Today**, **Add (+)**, **Progress**, **Account**.

### Today

1. **Summary card** (top): shows **eaten**, **remaining**, and **burned** calories. Tapping it expands to show protein, carbs, and fat against their targets.
2. **Food timeline**: entries in time order, one row each:

   ```
   time | full item name | calories
   8:12 AM | Greek yogurt, plain, nonfat (170 g) | 100
   ```

   Item names are shown in full, not truncated to a short label. Tapping a row shows its macros (and micronutrients if present).

3. **Exercise section**: synced and manual exercise with calories burned.

### Add (+)

Entry point for the three logging methods: search, create a food, and scan a label.

### Progress

Weigh-ins and trend, logging streak, and the neutral logging calendar.

### Account

Profile, goals, reminders, numbers-off mode, Apple Health connection, help & resources, sign out, and delete account.

## Onboarding survey

Collected on first run and used to calculate the initial goal:

- Weight
- Height
- Age
- Sex
- Activity level
- Why they're using the app (motivation)
- Goal (lose / maintain / gain, and pace)
- Dietary restrictions and allergies

All of it is editable later from Account.

## Safety rules

These rules are implemented as pure, unit-tested functions in `src/features/goals` (see [ARCHITECTURE.md](ARCHITECTURE.md#safety-rules)).

| Situation                                                                                                | Behavior                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weight-loss pace **> 2 lb/week**                                                                         | Allowed. Shows a caring warning recommending they talk to a doctor, with a link to help & resources. Never blocks.                                                                                                                                                                                                          |
| Weight-gain pace **> 1 lb/week** (placeholder, to be research-backed)                                    | Same pattern: a caring warning, not a block.                                                                                                                                                                                                                                                                                |
| **Calorie floor** (1,200 kcal female / 1,500 kcal male, 1,500 if sex isn't set; pending clinical review) | Invisible. If a calculated target would go below it, the floor is shown as the normal recommended target. The UI never mentions a floor, minimum, or rule, and never says the goal was limited. Users can set their own lower target; it's saved as-is with a gentle note: "Most people at your goal do well around X cal." |
| Day ends **near goal** (within ±200 kcal)                                                                | A small celebration.                                                                                                                                                                                                                                                                                                        |
| Day ends **well under goal**                                                                             | A gentle nudge with snack ideas to help reach the budget. Never praise.                                                                                                                                                                                                                                                     |
| Calendar                                                                                                 | Shows logged / not logged only, never good/bad coloring.                                                                                                                                                                                                                                                                    |
| Weigh-in reminders                                                                                       | Default weekly on Sunday morning; weekly, biweekly, or monthly is user-configurable.                                                                                                                                                                                                                                        |
| Account deletion                                                                                         | Permanently wipes all user data.                                                                                                                                                                                                                                                                                            |

Copy for every warning should be warm and specific. It should say what we noticed, why it matters, and where to get help. It should never shame the user.

### Allergen data

- **Allergen data may only be used to warn about or flag a food** ("Contains: gluten, soy"). It must **never** be used to label a food safe for an allergy: no "allergen-free", no "safe for you", and no reading "nothing flagged" as "safe". Provider data can be incomplete and doesn't cover cross-contact. Implemented in `src/features/food/logic/allergens.ts`.
- **Dining hall foods always show an allergen section with the cross-contact note**, on the food page now and in any diet-restriction feature later. The status says what Purdue Dining reported: "Contains: gluten, soy, wheat", "No allergens listed by Purdue Dining", or "Purdue Dining didn't provide allergen info for this item". It's always followed by "Allergen info from Purdue Dining. It may not reflect cross-contact; ask dining staff if you have an allergy." Stored as `foods.allergens`: flagged list, `{}` (none listed), or NULL (no data). Diet-restriction features may hide or flag foods that list an allergen, but never promise safety.
- Other foods show allergens only when some are flagged ("Contains: …").

## Non-goals

- Paywalls, premium tiers, or ads that gate features.
- Calorie estimates from meal photos.
- Social feeds or public weight sharing.
