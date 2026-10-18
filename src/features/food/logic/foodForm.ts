import { parseNumber } from '@/lib/format';
import { round2 } from '@/lib/nutrition';
import type { Food, Micronutrients, NutritionFacts } from '@/types/domain';

import type { NewFoodInput } from '../services/mappers';

export type FoodFormValues = {
  name: string;
  brand: string;
  servingSize: string;
  servingUnit: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
  saturatedFat: string;
  cholesterol: string;
  transFat: string;
  addedSugar: string;
  vitaminD: string;
  calcium: string;
  iron: string;
  potassium: string;
  magnesium: string;
  zinc: string;
};

export const EMPTY_FOOD_FORM: FoodFormValues = {
  name: '',
  brand: '',
  servingSize: '1',
  servingUnit: 'serving',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  sodium: '',
  saturatedFat: '',
  cholesterol: '',
  transFat: '',
  addedSugar: '',
  vitaminD: '',
  calcium: '',
  iron: '',
  potassium: '',
  magnesium: '',
  zinc: '',
};

export type FoodFormErrors = Partial<Record<keyof FoodFormValues, string>>;

/** Optional label nutrients: form field → micronutrient key (snake_case + unit). */
export const MICRO_FIELDS: { field: keyof FoodFormValues; key: string }[] = [
  { field: 'fiber', key: 'fiber_g' },
  { field: 'sugar', key: 'sugar_g' },
  { field: 'addedSugar', key: 'added_sugar_g' },
  { field: 'sodium', key: 'sodium_mg' },
  { field: 'saturatedFat', key: 'sat_fat_g' },
  { field: 'transFat', key: 'trans_fat_g' },
  { field: 'cholesterol', key: 'cholesterol_mg' },
  { field: 'vitaminD', key: 'vitamin_d_mcg' },
  { field: 'calcium', key: 'calcium_mg' },
  { field: 'iron', key: 'iron_mg' },
  { field: 'potassium', key: 'potassium_mg' },
  { field: 'magnesium', key: 'magnesium_mg' },
  { field: 'zinc', key: 'zinc_mg' },
];

/** Splits a serving label like "1.5 cup" or "2/3 cup (55 g)" into size and unit. */
function splitServingLabel(label: string): { size: string; unit: string } {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(.*)$/.exec(label);
  if (!m) return { size: '1', unit: label.trim() || 'serving' };
  return { size: m[1] ?? '1', unit: (m[2] ?? '').trim() || 'serving' };
}

const formNumber = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Form values for editing an existing food: nutrition per its default serving, as the form
 * expects (food value × serving multiplier).
 */
export function foodToFormValues(food: Food): FoodFormValues {
  const serving = food.servings.find((s) => s.isDefault) ?? food.servings[0];
  const multiplier = serving?.baseMultiplier ?? 1;
  const per = (n: number) => formNumber(n * multiplier);
  const { size, unit } = splitServingLabel(serving?.label ?? '1 serving');
  const values: FoodFormValues = {
    ...EMPTY_FOOD_FORM,
    name: food.name,
    brand: food.brand ?? '',
    servingSize: size,
    servingUnit: unit,
    calories: per(food.nutrition.calories),
    protein: per(food.nutrition.proteinG),
    carbs: per(food.nutrition.carbsG),
    fat: per(food.nutrition.fatG),
  };
  for (const { field, key } of MICRO_FIELDS) {
    const amount = food.nutrition.micronutrients[key];
    if (amount !== undefined) values[field] = per(amount);
  }
  return values;
}

/** Units that make a serving a weight or volume, so the food is stored per 100 of them. */
const MEASURED_UNITS: Record<string, 'g' | 'ml'> = { g: 'g', gram: 'g', grams: 'g', ml: 'ml' };

/** Like scaleNutrition, but keeps the database's two-decimal precision. */
function scaleNutrition2(facts: NutritionFacts, factor: number): NutritionFacts {
  const micronutrients: Micronutrients = {};
  for (const [key, amount] of Object.entries(facts.micronutrients)) {
    micronutrients[key] = round2(amount * factor);
  }
  return {
    calories: round2(facts.calories * factor),
    proteinG: round2(facts.proteinG * factor),
    carbsG: round2(facts.carbsG * factor),
    fatG: round2(facts.fatG * factor),
    micronutrients,
  };
}

/**
 * Validates the create-food form (nutrition as printed on the label, per serving) and converts
 * it to a NewFoodInput. Servings measured in g or ml are stored per 100 g/ml, like packaged
 * foods; anything else ("1 bar") is stored per 1 serving.
 */
export function parseFoodForm(
  values: FoodFormValues,
  { source = 'user_product' }: { source?: NewFoodInput['source'] } = {},
): { ok: true; input: NewFoodInput } | { ok: false; errors: FoodFormErrors } {
  const errors: FoodFormErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = 'Enter a name.';
  else if (name.length > 200) errors.name = 'Keep the name under 200 characters.';

  const servingSize = parseNumber(values.servingSize);
  if (servingSize === null || servingSize <= 0)
    errors.servingSize = 'Enter a serving size above 0.';
  const servingUnit = values.servingUnit.trim();
  if (!servingUnit) errors.servingUnit = 'Enter a unit, like g, cup, or piece.';

  const calories = parseNumber(values.calories);
  if (calories === null) errors.calories = 'Enter calories per serving.';
  else if (calories < 0) errors.calories = "Calories can't be negative.";

  const optional = (field: keyof FoodFormValues): number => {
    if (values[field].trim() === '') return 0;
    const n = parseNumber(values[field]);
    if (n === null || n < 0) {
      errors[field] = 'Enter a number, 0 or more.';
      return 0;
    }
    return n;
  };
  const proteinG = optional('protein');
  const carbsG = optional('carbs');
  const fatG = optional('fat');

  const micronutrients: Micronutrients = {};
  for (const { field, key } of MICRO_FIELDS) {
    if (values[field].trim() === '') continue;
    micronutrients[key] = optional(field);
  }

  if (Object.keys(errors).length > 0 || servingSize === null || calories === null) {
    return { ok: false, errors };
  }

  const perServing: NutritionFacts = { calories, proteinG, carbsG, fatG, micronutrients };
  const label = `${servingSize} ${servingUnit}`;
  // Meals and recipes are always stored per 1 serving (their nutrition is entered per serving);
  // packaged foods measured in g/ml are stored per 100, like Open Food Facts products.
  const measured = source === 'user_recipe' ? undefined : MEASURED_UNITS[servingUnit.toLowerCase()];
  const base = measured
    ? {
        baseAmount: 100,
        baseUnit: measured,
        nutrition: scaleNutrition2(perServing, 100 / servingSize),
        servings: [{ label, baseMultiplier: servingSize / 100, isDefault: true }],
      }
    : {
        baseAmount: 1,
        baseUnit: 'serving' as const,
        nutrition: perServing,
        servings: [{ label, baseMultiplier: 1, isDefault: true }],
      };

  return {
    ok: true,
    input: {
      source,
      name,
      brand: values.brand.trim() || null,
      barcode: null,
      ...base,
    },
  };
}
