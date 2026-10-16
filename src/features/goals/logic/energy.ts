import { CALORIE_FLOOR_KCAL } from '@/constants/safety';
import type { ActivityLevel, GoalType, Sex, UnitSystem } from '@/types/domain';

import { inToCm, lbToKg, type WeeklyRate, weeklyRateInLb } from './units';

/**
 * Body stats in the user's chosen units:
 * imperial → weight in lb, height in inches; metric → weight in kg, height in cm.
 */
export type BodyStats = {
  sex: Sex;
  ageYears: number;
  units: UnitSystem;
  weight: number;
  height: number;
};

function toMetric(stats: BodyStats): { weightKg: number; heightCm: number } {
  return stats.units === 'imperial'
    ? { weightKg: lbToKg(stats.weight), heightCm: inToCm(stats.height) }
    : { weightKg: stats.weight, heightCm: stats.height };
}

/**
 * Basal metabolic rate (kcal/day) using the Mifflin-St Jeor equation:
 *   10 × weight(kg) + 6.25 × height(cm) − 5 × age + s,  s = +5 (male) or −161 (female)
 */
export function calculateBMR(stats: BodyStats): number {
  const { weightKg, heightCm } = toMetric(stats);
  const sexConstant = stats.sex === 'male' ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * stats.ageYears + sexConstant;
}

/** Standard activity multipliers applied to BMR. */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

/** Total daily energy expenditure (kcal/day) = BMR × activity multiplier. */
export function calculateTDEE(stats: BodyStats, activityLevel: ActivityLevel): number {
  return calculateBMR(stats) * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * ~3,500 kcal per pound of body weight. This is the classic Wishnofsky approximation: it's a
 * reasonable planning number, but real-world change slows over time as the body adapts, so
 * treat targets as a starting point rather than a precise prediction.
 */
export const KCAL_PER_LB = 3500;

export type DailyTarget = {
  /** Recommended daily calories, rounded to the nearest 10. */
  target: number;
  bmr: number;
  tdee: number;
  /** Daily kcal removed (lose) or added (gain) relative to TDEE. 0 for maintain. */
  dailyAdjustment: number;
  /** The target before the recommended minimum was considered. */
  calculatedTarget: number;
  /** The recommended minimum for this profile. */
  floor: number;
  /** True when the calculated target was below the floor and the floor is recommended instead. */
  floorApplied: boolean;
};

const roundTo10 = (n: number) => Math.round(n / 10) * 10;

export function calculateDailyTarget({
  profile,
  goalType,
  weeklyRate,
}: {
  profile: BodyStats & { activityLevel: ActivityLevel };
  goalType: GoalType;
  /** Desired rate of change; ignored for maintain. Direction comes from goalType. */
  weeklyRate: WeeklyRate;
}): DailyTarget {
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(profile, profile.activityLevel);
  const ratePerDay = (Math.abs(weeklyRateInLb(weeklyRate)) * KCAL_PER_LB) / 7;
  const dailyAdjustment = goalType === 'maintain' ? 0 : ratePerDay;
  const signed = goalType === 'lose' ? -dailyAdjustment : dailyAdjustment;

  const calculatedTarget = roundTo10(tdee + signed);
  const floor = CALORIE_FLOOR_KCAL[profile.sex];
  const floorApplied = calculatedTarget < floor;

  return {
    target: floorApplied ? floor : calculatedTarget,
    bmr,
    tdee,
    dailyAdjustment,
    calculatedTarget,
    floor,
    floorApplied,
  };
}
