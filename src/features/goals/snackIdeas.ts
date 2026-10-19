import { type DietaryPrefs, type Ingredient, withoutConflicts } from '@/lib/dietary';

/**
 * Snack ideas for the under-goal nudge. Calories are rough, per typical portion. `contains` lists
 * what the snack commonly contains, for filtering; products vary, so the UI says to check labels.
 */
export type SnackIdea = { name: string; approxCalories: number; contains: Ingredient[] };

export const SNACK_IDEAS: readonly SnackIdea[] = [
  { name: 'Protein bar', approxCalories: 200, contains: ['milk', 'soy'] },
  { name: 'Greek yogurt with berries', approxCalories: 150, contains: ['milk'] },
  { name: 'Trail mix (about ¼ cup)', approxCalories: 175, contains: ['peanuts', 'tree_nuts'] },
  { name: 'Peanut butter toast', approxCalories: 250, contains: ['peanuts', 'wheat'] },
  // Fallbacks for when allergies or restrictions rule out the ones above.
  { name: 'Banana', approxCalories: 105, contains: [] },
  { name: 'Hummus with carrots and cucumber', approxCalories: 150, contains: ['sesame'] },
  { name: 'Apple with sunflower seed butter', approxCalories: 190, contains: [] },
];

/** Up to `limit` ideas that don't conflict with the user's allergies or restrictions. */
export function snackIdeasFor(prefs: DietaryPrefs, limit = 4): SnackIdea[] {
  return withoutConflicts(SNACK_IDEAS, prefs).slice(0, limit);
}
