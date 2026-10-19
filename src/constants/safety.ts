/**
 * Safety thresholds used by src/features/goals. Changing any of these changes what users are
 * told about their goals, so update docs/PRODUCT.md (Safety rules) in the same PR.
 */

/**
 * Recommended minimum daily calories without medical supervision.
 * Source: the commonly cited 1,200 kcal (women) / 1,500 kcal (men) guidance, e.g. Harvard
 * Health Publishing, "Calorie counting made easy", and NIH/NHLBI weight-management materials.
 * TODO(safety): verify against current clinical guidance before release.
 *
 * A calculated target below it is replaced by it and shown as the normal recommended target.
 * The UI never mentions a floor, minimum, or rule. Users can still set a lower target themselves.
 */
export const CALORIE_FLOOR_KCAL = {
  female: 1200,
  male: 1500,
} as const;

/** Used when sex isn't set: the higher of the two. */
export const CALORIE_FLOOR_FALLBACK_KCAL = Math.max(
  CALORIE_FLOOR_KCAL.female,
  CALORIE_FLOOR_KCAL.male,
);

/**
 * Losing faster than this shows a caring caution (never a block).
 * Source: CDC, "Losing Weight": gradual, steady loss of about 1–2 lb per week.
 */
export const MAX_RECOMMENDED_LOSS_LB_PER_WEEK = 2;

/**
 * Gaining faster than this shows a caring caution (never a block).
 * TODO(safety): research a guideline-backed value; ~0.5–1 lb/week is common advice for
 * intentional gain.
 */
export const MAX_RECOMMENDED_GAIN_LB_PER_WEEK = 1;

/**
 * Ending the day within this many calories of the target (either side) counts as near goal and
 * gets a small celebration. More than this below the target gets a gentle nudge instead.
 * TODO(safety): this threshold should be research-backed; 200 kcal is a starting guess.
 */
export const GOAL_CELEBRATE_RANGE = 200;

/** Local hour (24h) after which today counts as "evening" for end-of-day feedback. */
export const EVENING_FEEDBACK_HOUR = 19;
