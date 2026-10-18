/**
 * Allergen display rules.
 *
 * RULE (docs/PRODUCT.md): allergen data may only be used to WARN about or FLAG a food
 * ("contains gluten"). It must never be used to label a food safe for an allergy: no
 * "allergen-free", no "safe for you", no hiding the warning when nothing is flagged. Provider
 * data can be incomplete and doesn't cover cross-contact. Every place that shows provider
 * allergens must show allergenNotice() next to them.
 */
import type { Food } from '@/types/domain';

import { diningProviderLabel } from '@/features/dining/providers';

/** The note shown with allergens from a provider, or null when the food has no provider data. */
export function allergenNotice(food: Pick<Food, 'source' | 'provider'>): string | null {
  if (food.source !== 'dining_hall') return null;
  const provider = diningProviderLabel(food.provider) ?? 'the dining hall';
  return `Allergen info from ${provider}. It may not reflect cross-contact; ask dining staff if you have an allergy.`;
}

/** "Contains: gluten, soy, wheat" for flagged allergens, or null when none are flagged. */
export function containsLabel(food: Pick<Food, 'allergens'>): string | null {
  if (food.allergens.length === 0) return null;
  return `Contains: ${food.allergens.join(', ')}`;
}
