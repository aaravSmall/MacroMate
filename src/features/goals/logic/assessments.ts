import {
  MAX_RECOMMENDED_GAIN_LB_PER_WEEK,
  MAX_RECOMMENDED_LOSS_LB_PER_WEEK,
  NEAR_GOAL_BAND_KCAL,
} from '@/constants/safety';
import type { GoalType } from '@/types/domain';

import { type WeeklyRate, weeklyRateInLb } from './units';

export type PaceAssessment = 'ok' | 'caution';

/**
 * Flags paces worth a caring heads-up: losing faster than 2 lb/week, or gaining faster than
 * MAX_RECOMMENDED_GAIN_LB_PER_WEEK. There is deliberately no "blocked" result. Users can always
 * choose their own pace.
 */
export function assessPace(
  weeklyRate: WeeklyRate,
  goalType: GoalType,
  { maxGainLbPerWeek = MAX_RECOMMENDED_GAIN_LB_PER_WEEK }: { maxGainLbPerWeek?: number } = {},
): PaceAssessment {
  const lbPerWeek = Math.abs(weeklyRateInLb(weeklyRate));
  // Small tolerance so 0.907 kg (≈ 2 lb) isn't flagged by conversion rounding.
  const epsilon = 1e-3;
  if (goalType === 'lose') {
    return lbPerWeek > MAX_RECOMMENDED_LOSS_LB_PER_WEEK + epsilon ? 'caution' : 'ok';
  }
  if (goalType === 'gain') return lbPerWeek > maxGainLbPerWeek + epsilon ? 'caution' : 'ok';
  return 'ok';
}

export type DayStatus = 'near_goal' | 'under' | 'over' | 'in_progress';

/**
 * Where the day stands relative to the target.
 * - near_goal: within ±band of the target (inclusive)
 * - over: more than band above the target
 * - under: more than band below the target, once the day is complete
 * - in_progress: more than band below the target while the day is still going
 */
export function assessDayStatus(
  eaten: number,
  target: number,
  {
    isDayComplete = false,
    band = NEAR_GOAL_BAND_KCAL,
  }: { isDayComplete?: boolean; band?: number } = {},
): DayStatus {
  const difference = eaten - target;
  if (Math.abs(difference) <= band) return 'near_goal';
  if (difference > 0) return 'over';
  return isDayComplete ? 'under' : 'in_progress';
}

export type DayFeedback = 'celebrate' | 'gentle_nudge' | 'none';

/**
 * How the UI should respond to a day status. Only near_goal is celebrated. Under goal gets a
 * gentle nudge with snack ideas and is never praised (see PRODUCT.md design principles).
 */
export function feedbackForDayStatus(status: DayStatus): DayFeedback {
  switch (status) {
    case 'near_goal':
      return 'celebrate';
    case 'under':
      return 'gentle_nudge';
    case 'over':
    case 'in_progress':
      return 'none';
  }
}
