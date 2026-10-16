import { addDays, toDateKey } from '@/lib/dates';

/**
 * Consecutive days, ending today, with at least one log. If today has no log yet the streak
 * still counts back from yesterday, so it isn't "lost" first thing in the morning.
 * Streaks reward the habit of logging, never the number of calories.
 */
export function currentStreak(
  loggedDateKeys: ReadonlySet<string>,
  today: Date = new Date(),
): number {
  let day = loggedDateKeys.has(toDateKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (loggedDateKeys.has(toDateKey(day))) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}
