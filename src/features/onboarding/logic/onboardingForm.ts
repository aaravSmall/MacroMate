import type { ProfileUpdate } from '@/features/account';
import {
  assessPace,
  type BodyStats,
  calculateDailyTarget,
  cmToIn,
  type DailyTarget,
  defaultMacroTargets,
  inToCm,
  kgToLb,
  lbToKg,
  type NewGoal,
  type PaceAssessment,
  type WeeklyRate,
} from '@/features/goals';
import { parseNumber } from '@/lib/format';
import type { ActivityLevel, GoalType, Sex, UnitSystem } from '@/types/domain';

export type OnboardingForm = {
  units: UnitSystem;
  sex: Sex | null;
  age: string;
  /** lb (imperial) or kg (metric). */
  weight: string;
  heightFt: string;
  heightIn: string;
  heightCm: string;
  activityLevel: ActivityLevel | null;
  goalType: GoalType | null;
  /** lb/week (imperial) or kg/week (metric). */
  weeklyRate: number | null;
  /** Optional; lb or kg. */
  targetWeight: string;
  motivation: string;
  dietaryRestrictions: string[];
  allergies: string[];
};

export const INITIAL_ONBOARDING_FORM: OnboardingForm = {
  units: 'imperial',
  sex: null,
  age: '',
  weight: '',
  heightFt: '',
  heightIn: '',
  heightCm: '',
  activityLevel: null,
  goalType: null,
  weeklyRate: null,
  targetWeight: '',
  motivation: '',
  dietaryRestrictions: [],
  allergies: [],
};

/** Pace choices per unit system. Includes faster paces on purpose: they're allowed, with care. */
export const PACE_OPTIONS: Record<UnitSystem, readonly number[]> = {
  imperial: [0.5, 1, 1.5, 2, 2.5],
  metric: [0.25, 0.5, 0.75, 1, 1.25],
};

export const DIETARY_RESTRICTION_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Gluten-free',
  'Dairy-free',
  'Halal',
  'Kosher',
  'Low sodium',
] as const;

export const ALLERGY_OPTIONS = [
  'Peanuts',
  'Tree nuts',
  'Milk',
  'Eggs',
  'Wheat',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
] as const;

export function heightInCm(form: OnboardingForm): number | null {
  if (form.units === 'metric') return parseNumber(form.heightCm);
  const ft = parseNumber(form.heightFt);
  const inches = parseNumber(form.heightIn) ?? 0;
  if (ft === null) return null;
  return inToCm(ft * 12 + inches);
}

export function weightInKg(form: OnboardingForm, value: string = form.weight): number | null {
  const n = parseNumber(value);
  if (n === null) return null;
  return form.units === 'imperial' ? lbToKg(n) : n;
}

export type BodyStatsErrors = Partial<Record<'sex' | 'age' | 'weight' | 'height', string>>;

export function validateBodyStats(form: OnboardingForm): BodyStatsErrors {
  const errors: BodyStatsErrors = {};
  if (!form.sex) errors.sex = 'Choose one. It’s used to estimate your energy needs.';

  const age = parseNumber(form.age);
  if (age === null || !Number.isInteger(age)) errors.age = 'Enter your age in years.';
  else if (age < 13 || age > 120) errors.age = 'MacroMate is for ages 13 and up.';

  const kg = weightInKg(form);
  if (kg === null || kg < 20 || kg > 400) errors.weight = 'Enter your current weight.';

  const cm = heightInCm(form);
  if (cm === null || cm < 90 || cm > 250) errors.height = 'Enter your height.';

  return errors;
}

/** Switches unit systems, converting anything already entered. */
export function convertUnits(form: OnboardingForm, units: UnitSystem): OnboardingForm {
  if (units === form.units) return form;
  const round1 = (n: number) => String(Math.round(n * 10) / 10);
  const convertWeight = (value: string) => {
    const n = parseNumber(value);
    if (n === null) return value;
    return round1(units === 'metric' ? lbToKg(n) : kgToLb(n));
  };

  const next: OnboardingForm = {
    ...form,
    units,
    weight: convertWeight(form.weight),
    targetWeight: convertWeight(form.targetWeight),
    weeklyRate: null,
  };
  const cm = heightInCm(form);
  if (cm !== null) {
    if (units === 'metric') {
      next.heightCm = String(Math.round(cm));
    } else {
      const totalIn = Math.round(cmToIn(cm));
      next.heightFt = String(Math.floor(totalIn / 12));
      next.heightIn = String(totalIn % 12);
    }
  }
  return next;
}

/** YYYY-MM-DD for someone who is exactly `age` today (we ask age, not birth date). */
export function birthDateForAge(age: number, today: Date = new Date()): string {
  const date = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function weeklyRateFor(form: OnboardingForm): WeeklyRate {
  const amount = form.goalType === 'maintain' ? 0 : (form.weeklyRate ?? 0);
  return { amount, unit: form.units === 'imperial' ? 'lb' : 'kg' };
}

export function assessFormPace(form: OnboardingForm): PaceAssessment {
  if (!form.goalType) return 'ok';
  return assessPace(weeklyRateFor(form), form.goalType);
}

export type OnboardingResult = {
  dailyTarget: DailyTarget;
  pace: PaceAssessment;
  /** Saved to `profiles` (the row already exists; it's created at sign-up). */
  profileUpdate: ProfileUpdate;
  /** Saved to `goals` as the user's first active goal. */
  goal: NewGoal;
};

const roundTo1 = (n: number) => Math.round(n * 10) / 10;
const roundTo2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Computes the daily target, the profile fields, and the goal to save. Everything is stored
 * metric. Returns null if required answers are missing.
 */
export function buildOnboardingResult(
  form: OnboardingForm,
  { now = new Date(), timezone }: { now?: Date; timezone: string },
): OnboardingResult | null {
  if (Object.keys(validateBodyStats(form)).length > 0) return null;
  if (!form.sex || !form.activityLevel || !form.goalType) return null;
  if (form.goalType !== 'maintain' && form.weeklyRate === null) return null;

  const age = parseNumber(form.age) ?? 0;
  const heightCm = heightInCm(form) ?? 0;
  const weightKg = weightInKg(form) ?? 0;
  const stats: BodyStats = {
    sex: form.sex,
    ageYears: age,
    units: 'metric',
    weight: weightKg,
    height: heightCm,
  };
  const weeklyRate = weeklyRateFor(form);
  const dailyTarget = calculateDailyTarget({
    profile: { ...stats, activityLevel: form.activityLevel },
    goalType: form.goalType,
    weeklyRate,
  });
  const targetWeightKg = form.targetWeight.trim() ? weightInKg(form, form.targetWeight) : null;

  return {
    dailyTarget,
    pace: assessPace(weeklyRate, form.goalType),
    profileUpdate: {
      sex: form.sex,
      birthDate: birthDateForAge(age, now),
      heightCm: roundTo1(heightCm),
      activityLevel: form.activityLevel,
      unitSystem: form.units,
      timezone,
      motivation: form.motivation.trim() || null,
      dietaryRestrictions: form.dietaryRestrictions,
      allergies: form.allergies,
      onboardedAt: now.toISOString(),
    },
    goal: {
      goalType: form.goalType,
      startWeightKg: roundTo2(weightKg),
      targetWeightKg: targetWeightKg === null ? null : roundTo2(targetWeightKg),
      targetBodyFatPct: null,
      paceKgPerWeek: roundTo2(
        weeklyRate.unit === 'kg' ? weeklyRate.amount : lbToKg(weeklyRate.amount),
      ),
      dailyCalorieTarget: dailyTarget.target,
      macroTargets: defaultMacroTargets(dailyTarget.target),
    },
  };
}
