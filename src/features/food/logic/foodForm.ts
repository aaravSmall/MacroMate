import { parseNumber } from '@/lib/format';
import type { Micronutrients } from '@/types/domain';

import type { UserFoodInput } from '../services/mappers';

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
};

export type FoodFormErrors = Partial<Record<keyof FoodFormValues, string>>;

const MICRO_FIELDS: { field: keyof FoodFormValues; key: string }[] = [
  { field: 'fiber', key: 'fiber_g' },
  { field: 'sugar', key: 'sugar_g' },
  { field: 'sodium', key: 'sodium_mg' },
  { field: 'saturatedFat', key: 'saturated_fat_g' },
  { field: 'cholesterol', key: 'cholesterol_mg' },
];

/** Validates the create-food form and converts it to a UserFoodInput. */
export function parseFoodForm(
  values: FoodFormValues,
): { ok: true; input: UserFoodInput } | { ok: false; errors: FoodFormErrors } {
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

  return {
    ok: true,
    input: {
      name,
      brand: values.brand.trim() || null,
      restaurant: null,
      barcode: null,
      serving: {
        size: servingSize,
        unit: servingUnit,
        grams: servingUnit.toLowerCase() === 'g' ? servingSize : null,
      },
      nutrition: { calories, proteinG, carbsG, fatG, micronutrients },
    },
  };
}
