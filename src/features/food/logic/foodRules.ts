import { OFF_ID_PREFIX } from '@/lib/openFoodFacts';
import type { BaseUnit, Food, FoodServing } from '@/types/domain';

/** "100 g", "1 serving", "2 servings". */
export function baseServingLabel(amount: number, unit: BaseUnit): string {
  const n = Math.round(amount * 100) / 100;
  if (unit === 'serving') return `${n} ${n === 1 ? 'serving' : 'servings'}`;
  return `${n} ${unit}`;
}

/** An Open Food Facts result that isn't stored in `foods` (and so has no database id). */
export function isUncachedOpenFoodFactsResult(food: Pick<Food, 'id'>): boolean {
  return food.id.startsWith(OFF_ID_PREFIX);
}

export function defaultServing(food: Pick<Food, 'servings'>): FoodServing {
  const serving = food.servings.find((s) => s.isDefault) ?? food.servings[0];
  if (!serving) throw new Error('Food has no servings.');
  return serving;
}

/**
 * The serving in `servings` that matches `picked` (same size), else the default. Used after an
 * Open Food Facts result is cached, so the portion the user chose carries over.
 */
export function matchServing(
  servings: Pick<Food, 'servings'>['servings'],
  picked: Pick<FoodServing, 'baseMultiplier'>,
): FoodServing {
  return (
    servings.find((s) => Math.abs(s.baseMultiplier - picked.baseMultiplier) < 1e-3) ??
    defaultServing({ servings })
  );
}

/** Only the owner's recipes can be edited (RLS: "foods: edit own recipes"). */
export function canEditFood(food: Pick<Food, 'ownerId' | 'source'>, userId: string): boolean {
  return food.ownerId === userId && food.source === 'user_recipe';
}

/** Owners can delete their private foods (RLS: "foods: delete own private"). */
export function canDeleteFood(food: Pick<Food, 'ownerId' | 'visibility'>, userId: string): boolean {
  return food.ownerId === userId && food.visibility === 'private';
}

/**
 * Owners can share their own private foods to the global database, one way (RPC share_food).
 */
export function canShareFood(
  food: Pick<Food, 'ownerId' | 'visibility' | 'source'>,
  userId: string,
): boolean {
  return (
    food.ownerId === userId &&
    food.visibility === 'private' &&
    (food.source === 'user_product' ||
      food.source === 'user_recipe' ||
      food.source === 'label_scan')
  );
}

/**
 * Sources whose foods come from a package label people can compare against: Open Food Facts
 * products and user-uploaded products. Restaurant and dining hall food has no package label,
 * and neither do home-cooked meals (user_recipe).
 */
const LABEL_SOURCES: ReadonlySet<Food['source']> = new Set([
  'open_food_facts',
  'user_product',
  'label_scan',
]);

/** Whether "Does this match your label?" makes sense for this kind of food at all. */
export function needsLabelCheck(food: Pick<Food, 'source'>): boolean {
  return LABEL_SOURCES.has(food.source);
}

/**
 * Public foods someone else added can be checked against the user's label, when they come
 * from a label (see needsLabelCheck). Never the user's own foods or uncached OFF results.
 */
export function canVerifyFood(
  food: Pick<Food, 'id' | 'ownerId' | 'visibility' | 'source'>,
  userId: string,
): boolean {
  return (
    food.visibility === 'public' &&
    food.ownerId !== userId &&
    needsLabelCheck(food) &&
    !isUncachedOpenFoodFactsResult(food)
  );
}

/** More people said the label doesn't match than said it does. */
export function hasMismatchWarning(food: Pick<Food, 'verificationCount' | 'mismatchCount'>) {
  return food.mismatchCount > food.verificationCount;
}

/**
 * Compact label-check counts, like review counts: "✓ 24 · ✗ 2". Null when there's nothing to
 * show (not public, not a label food, or no votes yet).
 */
export function verificationSummary(
  food: Pick<Food, 'id' | 'visibility' | 'source' | 'verificationCount' | 'mismatchCount'>,
): { text: string; accessibilityLabel: string } | null {
  if (
    food.visibility !== 'public' ||
    !needsLabelCheck(food) ||
    isUncachedOpenFoodFactsResult(food)
  ) {
    return null;
  }
  const { verificationCount: yes, mismatchCount: no } = food;
  if (yes === 0 && no === 0) return null;
  return {
    text: `✓ ${yes} · ✗ ${no}`,
    accessibilityLabel:
      `${yes} ${yes === 1 ? 'person says' : 'people say'} it matches their label, ` +
      `${no} ${no === 1 ? 'says' : 'say'} it doesn't`,
  };
}
