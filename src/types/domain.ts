/**
 * Domain types used by UI and feature code. Services map raw database rows
 * (src/types/database.ts) into these shapes; nothing outside services should see a row.
 */
import type { Enums } from './database';

export type MealType = Enums<'meal_type'>;
export type FoodSource = Enums<'food_source'>;
export type FoodVisibility = Enums<'food_visibility'>;
export type BaseUnit = Enums<'base_unit'>;
export type ExerciseSource = Enums<'exercise_source'>;
export type GoalType = Enums<'goal_type'>;
export type ActivityLevel = Enums<'activity_level'>;
export type Sex = Enums<'sex_for_bmr'>;
export type UnitSystem = Enums<'unit_system'>;
export type WeighInFrequency = Enums<'weigh_in_freq'>;

/** Micronutrient amounts keyed by snake_case name + unit, e.g. `sodium_mg`, `fiber_g`. */
export type Micronutrients = Record<string, number>;

export type NutritionFacts = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  micronutrients: Micronutrients;
};

/** A named portion of a food, e.g. "1 cup (240 g)". */
export type FoodServing = {
  /** Database id, or null for a portion that isn't stored (Open Food Facts results, fallbacks). */
  id: string | null;
  label: string;
  /** How many of the food's base amounts this portion is. */
  baseMultiplier: number;
  isDefault: boolean;
};

/** A stored food, or a not-yet-cached Open Food Facts result. */
export type Food = {
  /** Database id, or `off:<barcode>` for an Open Food Facts result that isn't stored. */
  id: string;
  ownerId: string | null;
  visibility: FoodVisibility;
  source: FoodSource;
  externalId: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  baseAmount: number;
  baseUnit: BaseUnit;
  /** Per `baseAmount` of `baseUnit`. */
  nutrition: NutritionFacts;
  /** Never empty; the default serving comes first. */
  servings: FoodServing[];
  verificationCount: number;
  mismatchCount: number;
};

export type LogEntry = {
  id: string;
  /** ISO timestamp. */
  loggedAt: string;
  /** `YYYY-MM-DD` in the user's timezone at log time. */
  localDate: string;
  meal: MealType;
  /** Null when the food wasn't stored (Open Food Facts) or has since been deleted. */
  foodId: string | null;
  servingId: string | null;
  quantity: number;
  /** Snapshot taken at log time. */
  foodName: string;
  /** Snapshot totals for the whole entry (food × serving × quantity). */
  totals: NutritionFacts;
};

export type DailyTotals = {
  localDate: string;
  entryCount: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type ExerciseEntry = {
  id: string;
  source: ExerciseSource;
  externalId: string | null;
  activityType: string;
  /** ISO timestamp. */
  startedAt: string;
  /** ISO timestamp. */
  endedAt: string;
  localDate: string;
  activeCalories: number;
};

export type WeighIn = {
  id: string;
  /** ISO timestamp. */
  measuredAt: string;
  localDate: string;
  weightKg: number;
  bodyFatPct: number | null;
};

export type MacroTargets = {
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

/** The user's active goal. Changing goals ends this one and starts a new one. */
export type Goal = {
  id: string;
  goalType: GoalType;
  startWeightKg: number;
  targetWeightKg: number | null;
  targetBodyFatPct: number | null;
  /** Always >= 0; direction comes from goalType. */
  paceKgPerWeek: number;
  dailyCalorieTarget: number;
  macroTargets: MacroTargets;
  /** ISO timestamp. */
  startedAt: string;
};

export type Profile = {
  id: string;
  displayName: string | null;
  sex: Sex | null;
  /** YYYY-MM-DD. */
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: ActivityLevel | null;
  unitSystem: UnitSystem;
  /** IANA timezone, e.g. `America/New_York`. Sets each log's local date. */
  timezone: string;
  motivation: string | null;
  dietaryRestrictions: string[];
  allergies: string[];
  numbersOff: boolean;
  weighInFrequency: WeighInFrequency;
  /** 0 = Sunday … 6 = Saturday. */
  weighInWeekday: number;
  /** `HH:MM[:SS]` local time. */
  weighInReminderTime: string;
  /** ISO timestamp, or null while onboarding is incomplete. */
  onboardedAt: string | null;
};
