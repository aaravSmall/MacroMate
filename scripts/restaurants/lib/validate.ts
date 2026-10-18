import type { NormalizedItem } from './normalize';

/** Calories may differ from 4/4/9 macros by this much before a row is held for review. */
export const MACRO_TOLERANCE = 0.2;
/** …but tiny items get an absolute allowance (rounding dominates under ~50 kcal). */
export const MACRO_TOLERANCE_KCAL = 10;

/** Protein × 4 + carbs × 4 + fat × 9. */
export function macroCalories(food: { protein_g: number; carbs_g: number; fat_g: number }): number {
  return food.protein_g * 4 + food.carbs_g * 4 + food.fat_g * 9;
}

/** Why a row's calories don't match its macros, or null when they're close enough. */
export function macroMismatch(food: {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}): string | null {
  const estimate = macroCalories(food);
  const allowed = Math.max(
    MACRO_TOLERANCE * Math.max(food.calories, estimate),
    MACRO_TOLERANCE_KCAL,
  );
  if (Math.abs(food.calories - estimate) <= allowed) return null;
  const pct =
    estimate === 0 ? 100 : Math.round((Math.abs(food.calories - estimate) / estimate) * 100);
  return `Calories (${food.calories}) are ${pct}% off 4/4/9 macros (${Math.round(estimate)}).`;
}

/** Adds review reasons and splits items into ready-to-upload and held-for-review. */
export function validateItems(items: NormalizedItem[]): {
  ready: NormalizedItem[];
  flagged: (NormalizedItem & { approved: boolean })[];
} {
  const ready: NormalizedItem[] = [];
  const flagged: (NormalizedItem & { approved: boolean })[] = [];
  for (const item of items) {
    const mismatch = macroMismatch(item.food);
    if (mismatch) item.reasons.push(mismatch);
    if (item.food.calories < 0 || item.food.calories > 5000) {
      item.reasons.push('Calories out of range.');
    }
    if (item.reasons.length > 0) flagged.push({ ...item, approved: false });
    else ready.push(item);
  }
  return { ready, flagged };
}
