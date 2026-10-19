import type { ActivityLevel, GoalType, Sex, UnitSystem } from '@/types/domain';

import type { NewGoal } from '../services/goalService';
import { assessPace, type PaceAssessment } from './assessments';
import { calculateDailyTarget, type DailyTarget } from './energy';
import { defaultMacroTargets } from './macros';
import { ageFromBirthDate, lbToKg } from './units';

export type GoalChangeInput = {
  profile: {
    sex: Sex | null;
    birthDate: string | null;
    heightCm: number | null;
    activityLevel: ActivityLevel | null;
    unitSystem: UnitSystem;
  };
  /** Most recent known weight: latest weigh-in, else the current goal's start weight. */
  currentWeightKg: number | null;
  goalType: GoalType;
  /** Per week in the profile's units (lb or kg); ignored for maintain. */
  weeklyRate: number | null;
  targetWeightKg: number | null;
  now?: Date;
};

export type GoalChange = { dailyTarget: DailyTarget; pace: PaceAssessment; goal: NewGoal };

const roundTo2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Recomputes the daily target and pace assessment for a new goal, using the saved profile and
 * the latest weight. Returns null if anything needed is missing.
 */
export function buildGoalChange({
  profile,
  currentWeightKg,
  goalType,
  weeklyRate,
  targetWeightKg,
  now = new Date(),
}: GoalChangeInput): GoalChange | null {
  const { sex, birthDate, heightCm, activityLevel, unitSystem } = profile;
  if (!sex || !birthDate || !heightCm || !activityLevel || !currentWeightKg) return null;
  if (goalType !== 'maintain' && weeklyRate === null) return null;

  const rate = {
    amount: goalType === 'maintain' ? 0 : (weeklyRate ?? 0),
    unit: unitSystem === 'imperial' ? ('lb' as const) : ('kg' as const),
  };
  const dailyTarget = calculateDailyTarget({
    profile: {
      sex,
      ageYears: ageFromBirthDate(birthDate, now),
      units: 'metric',
      weight: currentWeightKg,
      height: heightCm,
      activityLevel,
    },
    goalType,
    weeklyRate: rate,
  });

  return {
    dailyTarget,
    pace: assessPace(rate, goalType),
    goal: {
      goalType,
      startWeightKg: roundTo2(currentWeightKg),
      targetWeightKg:
        goalType === 'maintain' || targetWeightKg === null ? null : roundTo2(targetWeightKg),
      targetBodyFatPct: null,
      paceKgPerWeek: roundTo2(rate.unit === 'kg' ? rate.amount : lbToKg(rate.amount)),
      dailyCalorieTarget: dailyTarget.target,
      macroTargets: defaultMacroTargets(dailyTarget.target),
    },
  };
}
