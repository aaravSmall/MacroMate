/**
 * Domain types used by UI and feature code. Services map raw database rows
 * (src/types/database.ts) into these shapes; nothing outside services should see a row.
 */
import type { Enums } from './database';

export type MealLabel = Enums<'meal_label'>;
export type FoodSource = Enums<'food_source'>;
export type ExerciseSource = Enums<'exercise_source'>;
export type GoalType = Enums<'goal_type'>;
export type ActivityLevel = Enums<'activity_level'>;
export type Sex = Enums<'sex'>;
export type UnitSystem = Enums<'unit_system'>;

/** Micronutrient amounts keyed by snake_case name + unit, e.g. `sodium_mg`, `fiber_g`. */
export type Micronutrients = Record<string, number>;

export type NutritionFacts = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  micronutrients: Micronutrients;
};

export type Serving = {
  size: number;
  unit: string;
  /** Weight of one serving in grams, when known. */
  grams: number | null;
};

/** A food from the global database, or a not-yet-imported Open Food Facts result. */
export type Food = {
  /** Database id, or `off:<barcode>` for an Open Food Facts result that isn't stored yet. */
  id: string;
  kind: 'food';
  name: string;
  brand: string | null;
  restaurant: string | null;
  source: FoodSource;
  externalId: string | null;
  barcode: string | null;
  serving: Serving;
  /** Per serving. */
  nutrition: NutritionFacts;
};

/** A food from the user's private "My Foods". */
export type UserFood = {
  id: string;
  kind: 'userFood';
  name: string;
  brand: string | null;
  restaurant: string | null;
  barcode: string | null;
  serving: Serving;
  /** Per serving. */
  nutrition: NutritionFacts;
  isShared: boolean;
  sharedFoodId: string | null;
};

export type AnyFood = Food | UserFood;

export type LogEntrySource =
  | { kind: 'food'; foodId: string }
  | { kind: 'userFood'; userFoodId: string }
  /** The original food was deleted; the snapshot remains. */
  | null;

export type LogEntry = {
  id: string;
  /** ISO timestamp. */
  loggedAt: string;
  mealLabel: MealLabel;
  source: LogEntrySource;
  servings: number;
  /** Snapshot taken at log time. */
  foodName: string;
  foodBrand: string | null;
  serving: Omit<Serving, 'grams'>;
  /** Snapshot, per serving. */
  nutritionPerServing: NutritionFacts;
  /** `nutritionPerServing × servings`. */
  totals: NutritionFacts;
};

export type ExerciseEntry = {
  id: string;
  source: ExerciseSource;
  externalId: string | null;
  activityType: string;
  /** ISO timestamp. */
  startedAt: string;
  durationMin: number;
  caloriesBurned: number;
};

export type WeighIn = {
  id: string;
  /** ISO timestamp. */
  measuredAt: string;
  weightKg: number;
  bodyFatPct: number | null;
};

export type MacroTargets = {
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type Profile = {
  id: string;
  displayName: string | null;
  sex: Sex | null;
  /** YYYY-MM-DD. */
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: ActivityLevel | null;
  goalType: GoalType | null;
  targetWeightKg: number | null;
  /** Always >= 0; direction comes from goalType. */
  weeklyRateKg: number | null;
  dailyCalorieTarget: number | null;
  macroTargets: MacroTargets;
  numbersOffMode: boolean;
  units: UnitSystem;
  motivation: string | null;
  dietaryRestrictions: string[];
  allergies: string[];
  /** ISO timestamp, or null while onboarding is incomplete. */
  onboardingCompletedAt: string | null;
};
