/**
 * Matches foods and suggestions against a user's stated allergies and dietary restrictions.
 * Pure; the single place this logic lives.
 *
 * RULE (docs/PRODUCT.md): this may only WARN about or FILTER OUT likely conflicts. It must never
 * be used to call something safe for an allergy: data can be incomplete and doesn't cover
 * cross-contact. Anything shown after filtering still says to check the label.
 */

/** Ingredient groups we can recognize. Allergy options map onto these. */
export type Ingredient =
  | 'milk'
  | 'eggs'
  | 'fish'
  | 'shellfish'
  | 'peanuts'
  | 'tree_nuts'
  | 'wheat'
  | 'soy'
  | 'sesame'
  | 'meat';

/** Onboarding allergy options (see ALLERGY_OPTIONS) → ingredient groups. */
const ALLERGY_INGREDIENTS: Record<string, Ingredient[]> = {
  peanuts: ['peanuts'],
  'tree nuts': ['tree_nuts'],
  milk: ['milk'],
  eggs: ['eggs'],
  wheat: ['wheat'],
  soy: ['soy'],
  fish: ['fish'],
  shellfish: ['shellfish'],
  sesame: ['sesame'],
};

/**
 * Onboarding restriction options → ingredient groups they exclude. Halal, kosher, and low sodium
 * can't be judged from ingredient groups, so they never flag anything.
 */
const RESTRICTION_INGREDIENTS: Record<string, Ingredient[]> = {
  vegan: ['milk', 'eggs', 'fish', 'shellfish', 'meat'],
  vegetarian: ['fish', 'shellfish', 'meat'],
  pescatarian: ['meat'],
  'gluten-free': ['wheat'],
  'dairy-free': ['milk'],
};

/**
 * Allergen strings from data sources ("en:milk", "Gluten", "Tree Nuts", "Crustacean shellfish")
 * → ingredient groups. Unknown strings map to nothing.
 */
const SOURCE_ALLERGEN_PATTERNS: [RegExp, Ingredient][] = [
  [/\b(milk|dairy|lactose|whey|casein)\b/, 'milk'],
  [/\beggs?\b/, 'eggs'],
  [/\b(crustacean|shellfish|mollus[ck]s?|shrimp|crab|lobster)\b/, 'shellfish'],
  [/\bfish\b/, 'fish'],
  [/\bpeanuts?\b/, 'peanuts'],
  [
    /\b(tree[ -]?nuts?|nuts|almonds?|cashews?|walnuts?|pecans?|hazelnuts?|pistachios?)\b/,
    'tree_nuts',
  ],
  [/\b(wheat|gluten)\b/, 'wheat'],
  [/\b(soy|soybeans?|soya)\b/, 'soy'],
  [/\bsesame( seeds?)?\b/, 'sesame'],
];

export type DietaryPrefs = { allergies: readonly string[]; restrictions: readonly string[] };

/** Ingredient groups found in a source's allergen list. */
export function ingredientsFromAllergens(allergens: readonly string[]): Ingredient[] {
  const found = new Set<Ingredient>();
  for (const raw of allergens) {
    const text = raw
      .toLowerCase()
      .replace(/^[a-z]{2}:/, '')
      .replace(/[-_]/g, ' ');
    for (const [pattern, ingredient] of SOURCE_ALLERGEN_PATTERNS) {
      if (pattern.test(text)) {
        found.add(ingredient);
        // "Peanuts" also matches the generic "nuts" pattern; don't double-count it as tree nuts.
        if (ingredient === 'peanuts') break;
      }
    }
  }
  return [...found];
}

export type DietaryConflict = { kind: 'allergy' | 'restriction'; label: string };

/**
 * The user's allergies and restrictions that an item's ingredient groups conflict with, using
 * the user's own wording ("Peanuts", "Vegan"). Empty means no known conflict, not "safe".
 */
export function dietaryConflicts(
  ingredients: readonly Ingredient[],
  prefs: DietaryPrefs,
): DietaryConflict[] {
  const present = new Set(ingredients);
  const conflicts: DietaryConflict[] = [];
  for (const allergy of prefs.allergies) {
    const groups = ALLERGY_INGREDIENTS[allergy.toLowerCase()] ?? [];
    if (groups.some((g) => present.has(g))) conflicts.push({ kind: 'allergy', label: allergy });
  }
  for (const restriction of prefs.restrictions) {
    const groups = RESTRICTION_INGREDIENTS[restriction.toLowerCase()] ?? [];
    if (groups.some((g) => present.has(g))) {
      conflicts.push({ kind: 'restriction', label: restriction });
    }
  }
  return conflicts;
}

/** Drops suggestions that conflict with the user's prefs. Never use this on search results. */
export function withoutConflicts<T extends { contains: readonly Ingredient[] }>(
  items: readonly T[],
  prefs: DietaryPrefs,
): T[] {
  return items.filter((item) => dietaryConflicts(item.contains, prefs).length === 0);
}
