# Product spec

This document records Tally's product decisions. If a change conflicts with something here, update this doc in the same PR (and explain why).

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
3. **Scan a nutrition label photo**: OCR the nutrition facts panel and pre-fill the create-food form for the user to review and save.

Tally deliberately does **not** estimate calories from a photo of a meal. That estimate is unreliable, and presenting it as data would undermine trust in every other number.

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

- Apple Health sync for workouts and active energy (requires a development build; it can't run in Expo Go).
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

| Situation                        | Behavior                                                                                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weight-loss pace **> 2 lb/week** | Allowed. Shows a caring warning recommending they talk to a doctor, with a link to help & resources. Never blocks.                                                                                        |
| Weight-gain pace too fast        | Same pattern: a caring warning, not a block.                                                                                                                                                              |
| **Calorie floor**                | There's a hidden minimum budget. If a goal would go below it, the app offers the floor **as a normal recommendation**. It isn't framed as a limit or an error, and the floor value itself is never shown. |
| Day ends **near goal**           | A small celebration.                                                                                                                                                                                      |
| Day ends **well under goal**     | A gentle nudge with snack ideas to help reach the budget. Never praise.                                                                                                                                   |
| Calendar                         | Shows logged / not logged only, never good/bad coloring.                                                                                                                                                  |
| Weigh-in reminders               | Default weekly on Sunday morning; weekly, biweekly, or monthly is user-configurable.                                                                                                                      |
| Account deletion                 | Permanently wipes all user data.                                                                                                                                                                          |

Copy for every warning should be warm and specific. It should say what we noticed, why it matters, and where to get help. It should never shame the user.

## Non-goals

- Paywalls, premium tiers, or ads that gate features.
- Calorie estimates from meal photos.
- Social feeds or public weight sharing.
