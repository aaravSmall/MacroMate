/**
 * Post-workout refuel prompts. Encourages eating after exercise without pressure; never frames
 * food as earned or exercise as a reason to restrict. Pure.
 */
import { type DietaryPrefs, type Ingredient, withoutConflicts } from '@/lib/dietary';

export type RefuelKind = 'running' | 'strength' | 'climbing' | 'generic';

/**
 * HealthKit workout types (as stored: humanized enum names, see humanizeActivity) → tip kind.
 * Anything not listed gets the generic tip.
 */
const KIND_BY_ACTIVITY: Record<string, RefuelKind> = {
  running: 'running',
  'wheelchair run pace': 'running',
  'strength training': 'strength',
  'functional strength training': 'strength',
  'core training': 'strength',
  climbing: 'climbing',
};

export function refuelKind(activityType: string): RefuelKind {
  return KIND_BY_ACTIVITY[activityType.trim().toLowerCase()] ?? 'generic';
}

type RefuelTip = { text: string; ideas: { name: string; contains: Ingredient[] }[] };

/** One tip per kind. Add kinds here to vary tips by workout type. */
export const REFUEL_TIPS: Record<RefuelKind, RefuelTip> = {
  running: {
    text: 'After a run, some carbs help top your energy back up.',
    ideas: [
      { name: 'a banana', contains: [] },
      { name: 'toast with jam', contains: ['wheat'] },
      { name: 'a bowl of cereal with milk', contains: ['wheat', 'milk'] },
      { name: 'rice and beans', contains: [] },
    ],
  },
  strength: {
    text: 'After lifting, a little protein helps your muscles recover.',
    ideas: [
      { name: 'Greek yogurt', contains: ['milk'] },
      { name: 'eggs on toast', contains: ['eggs', 'wheat'] },
      { name: 'a protein shake', contains: ['milk'] },
      { name: 'tofu or edamame', contains: ['soy'] },
      { name: 'hummus with pita', contains: ['sesame', 'wheat'] },
    ],
  },
  climbing: {
    text: 'After climbing, protein helps your muscles and tendons recover. Some climbers add collagen too.',
    ideas: [
      { name: 'cottage cheese', contains: ['milk'] },
      { name: 'a turkey sandwich', contains: ['meat', 'wheat'] },
      { name: 'lentil soup', contains: [] },
      { name: 'trail mix', contains: ['peanuts', 'tree_nuts'] },
    ],
  },
  generic: {
    text: 'A snack with some carbs and protein can help your body recover.',
    ideas: [
      { name: 'yogurt with fruit', contains: ['milk'] },
      { name: 'peanut butter toast', contains: ['peanuts', 'wheat'] },
      { name: 'a banana', contains: [] },
      { name: 'hummus and veggies', contains: ['sesame'] },
    ],
  },
};

const formatKcal = (kcal: number) => Math.round(kcal).toLocaleString('en-US');

/**
 * The refuel card or notification text. Leaves out calories in numbers-off mode or when Health
 * didn't report any. Suggestions skip anything that conflicts with the user's allergies or
 * restrictions (and are left out if none remain).
 */
export function refuelMessage({
  activityType,
  burnedKcal,
  numbersOff = false,
  prefs = { allergies: [], restrictions: [] },
}: {
  activityType: string;
  burnedKcal: number | null;
  numbersOff?: boolean;
  prefs?: DietaryPrefs;
}): { title: string; message: string; tip: string } {
  const tip = REFUEL_TIPS[refuelKind(activityType)];
  const ideas = withoutConflicts(
    tip.ideas.map((i) => ({ ...i })),
    prefs,
  ).slice(0, 2);
  const showCalories = !numbersOff && burnedKcal !== null && burnedKcal > 0;
  return {
    title: 'Nice workout!',
    message: showCalories
      ? `You burned about ${formatKcal(burnedKcal)} cal. Don't forget to refuel.`
      : "Don't forget to refuel.",
    tip:
      ideas.length > 0 ? `${tip.text} Maybe ${ideas.map((i) => i.name).join(' or ')}?` : tip.text,
  };
}

/** Only notify about workouts that ended recently, not ones found by a later catch-up sync. */
export const REFUEL_NOTIFY_WITHIN_MS = 2 * 60 * 60 * 1000;
/** "Shortly after": give the user a moment after the sync. */
export const REFUEL_NOTIFY_DELAY_MS = 60 * 1000;

/**
 * Workouts just read from Apple Health that should get a refuel notification: ended within the
 * last two hours and not already notified or dismissed. Returns their external ids.
 */
export function workoutsToNotify<T extends { externalId: string; endedAt: Date }>(
  workouts: readonly T[],
  { now, alreadyHandled }: { now: Date; alreadyHandled: ReadonlySet<string> },
): T[] {
  return workouts.filter((w) => {
    const ago = now.getTime() - w.endedAt.getTime();
    return !alreadyHandled.has(w.externalId) && ago >= 0 && ago <= REFUEL_NOTIFY_WITHIN_MS;
  });
}
