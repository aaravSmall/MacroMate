/**
 * Allergen display rules.
 *
 * RULE (docs/PRODUCT.md): allergen data may only be used to WARN about or FLAG a food
 * ("Contains: gluten"). It must never be used to label a food safe for an allergy: never
 * "allergen-free", "safe", or "contains no allergens". "No allergens listed" reports what the
 * source said, not that the food is safe. Provider data can be incomplete and doesn't cover
 * cross-contact, so every dining hall food always shows its allergen status together with the
 * cross-contact note.
 */
import { diningProviderLabel } from '@/features/dining/providers';
import type { Food } from '@/types/domain';

export type AllergenSection = {
  /** What the source said: flagged allergens, none listed, or no data. */
  status: string;
  /** Always shown with the status. */
  note: string;
};

/**
 * The allergen section for a dining hall food, which always has one. Null for other foods,
 * whose display is unchanged (see containsLabel).
 */
export function allergenNotice(
  food: Pick<Food, 'source' | 'provider' | 'allergens'>,
): AllergenSection | null {
  if (food.source !== 'dining_hall') return null;
  const provider = diningProviderLabel(food.provider) ?? 'the dining hall';
  const note = `Allergen info from ${provider}. It may not reflect cross-contact; ask dining staff if you have an allergy.`;
  if (food.allergens === null) {
    return { status: `${provider} didn't provide allergen info for this item`, note };
  }
  if (food.allergens.length === 0) {
    return { status: `No allergens listed by ${provider}`, note };
  }
  return { status: `Contains: ${food.allergens.join(', ')}`, note };
}

/** For non-dining foods: "Contains: …" when allergens are flagged, otherwise nothing. */
export function containsLabel(food: Pick<Food, 'allergens'>): string | null {
  if (!food.allergens || food.allergens.length === 0) return null;
  return `Contains: ${food.allergens.join(', ')}`;
}
