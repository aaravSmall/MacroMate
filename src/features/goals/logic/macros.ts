import type { MacroTargets } from '@/types/domain';

/**
 * Default macro split as a share of calories. A balanced starting point within the
 * Acceptable Macronutrient Distribution Ranges (protein 10–35%, carbs 45–65%, fat 20–35%).
 */
export const DEFAULT_MACRO_SPLIT = { protein: 0.25, carbs: 0.45, fat: 0.3 } as const;

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/** Gram targets for a daily calorie target, rounded to whole grams. */
export function defaultMacroTargets(dailyCalories: number): MacroTargets {
  return {
    proteinG: Math.round((dailyCalories * DEFAULT_MACRO_SPLIT.protein) / KCAL_PER_GRAM.protein),
    carbsG: Math.round((dailyCalories * DEFAULT_MACRO_SPLIT.carbs) / KCAL_PER_GRAM.carbs),
    fatG: Math.round((dailyCalories * DEFAULT_MACRO_SPLIT.fat) / KCAL_PER_GRAM.fat),
  };
}
