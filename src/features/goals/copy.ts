/**
 * User-facing copy for goal safety. Keep it warm and specific: say what we noticed, why it
 * matters, and where to find support. Never frame a recommendation as a rule or a block.
 */
import type { GoalType } from '@/types/domain';

const formatKcal = (kcal: number) => Math.round(kcal).toLocaleString('en-US');

export function calorieFloorRecommendation(floor: number): string {
  return `We recommend at least ${formatKcal(floor)} calories a day.`;
}

export function paceCautionCopy(goalType: GoalType): { title: string; message: string } {
  if (goalType === 'gain') {
    return {
      title: 'A quick note on your pace',
      message:
        "Gaining weight this quickly can be hard on your body. It's worth checking in with " +
        'a doctor or registered dietitian about a pace that works for you.',
    };
  }
  return {
    title: 'A quick note on your pace',
    message:
      'Losing more than 2 lb a week is faster than most health guidance recommends, and it can ' +
      "be hard to sustain. You're welcome to keep this pace. We'd also encourage you to talk " +
      'with a doctor about it.',
  };
}

export const UNDER_GOAL_NUDGE = {
  title: 'Room for a little more today',
  message: "You've got some calories left. If you're hungry, here are a few easy ideas.",
};

/**
 * After a synced workout. Encourages refueling without pressure; never frames eating as earning
 * or burning as a reason to restrict. Without numbers in numbers-off mode.
 */
export function refuelCopy(
  activity: string,
  burnedKcal: number | null,
): { title: string; message: string } {
  const activityName = activity.toLowerCase();
  const recover =
    "If you're hungry, a snack with some carbs and protein can help your body recover.";
  return {
    title: `Nice work on your ${activityName}`,
    message:
      burnedKcal !== null && burnedKcal > 0
        ? `About ${formatKcal(burnedKcal)} calories from it were added to today's budget. ${recover}`
        : recover,
  };
}

export const NEAR_GOAL_CELEBRATION = {
  title: 'Nicely done',
  message: 'You landed close to your goal today.',
};
