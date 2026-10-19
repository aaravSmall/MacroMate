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
      title: 'A friendly note on your pace',
      message:
        "We love that you're working toward this. Gaining more than about 1 lb a week can be a " +
        'lot for your body to adjust to, so it might be worth a quick chat with your doctor or ' +
        "a dietitian about a pace that feels good. This is your call, and we're here either way.",
    };
  }
  return {
    title: 'A friendly note on your pace',
    message:
      "We're cheering you on. Losing more than 2 lb a week can be hard on your body and tough " +
      "to keep up, so it could help to check in with your doctor about it. You're welcome to " +
      "keep this pace. It's your call, and we're here either way.",
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
