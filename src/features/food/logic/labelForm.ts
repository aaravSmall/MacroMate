import type { FoodFormValues } from './foodForm';
import type { LabelNutrient, ParsedLabel } from './labelParser';

/** Which form field each parsed label nutrient fills. */
const NUTRIENT_FIELDS: Record<LabelNutrient, keyof FoodFormValues> = {
  fat_g: 'fat',
  sat_fat_g: 'saturatedFat',
  trans_fat_g: 'transFat',
  cholesterol_mg: 'cholesterol',
  sodium_mg: 'sodium',
  carbs_g: 'carbs',
  fiber_g: 'fiber',
  sugar_g: 'sugar',
  added_sugar_g: 'addedSugar',
  protein_g: 'protein',
  vitamin_d_mcg: 'vitaminD',
  calcium_mg: 'calcium',
  iron_mg: 'iron',
  potassium_mg: 'potassium',
  magnesium_mg: 'magnesium',
  zinc_mg: 'zinc',
};

/** Fields every label has; if they're missing, the user must fill them in. */
const CORE_FIELDS: (keyof FoodFormValues)[] = [
  'servingSize',
  'servingUnit',
  'calories',
  'fat',
  'carbs',
  'protein',
];

export type LabelFormPrefill = {
  values: FoodFormValues;
  /** Fields to highlight: low-confidence, OCR-repaired, or missing core values. The name too. */
  needsReview: (keyof FoodFormValues)[];
  /** True when almost nothing was read, so the photo probably wasn't a Nutrition Facts panel. */
  looksEmpty: boolean;
};

const num = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Prefills the create-food form from a parsed label. Nutrition stays per serving as printed;
 * the serving is the printed metric amount (g/ml) when there is one, so the food is stored per
 * 100 g/ml, else the household measure ("1 bar").
 */
export function labelToFoodForm(label: ParsedLabel, base: FoodFormValues): LabelFormPrefill {
  const values: FoodFormValues = { ...base, name: '' };
  const review = new Set<keyof FoodFormValues>(['name']);
  const flag = (field: keyof FoodFormValues, confidence: 'high' | 'medium' | 'low') => {
    if (confidence !== 'high') review.add(field);
  };

  const serving = label.servingSize;
  if (serving) {
    const { grams, ml, amount, unit } = serving.value;
    if (grams !== null) {
      values.servingSize = num(grams);
      values.servingUnit = 'g';
    } else if (ml !== null) {
      values.servingSize = num(ml);
      values.servingUnit = 'ml';
    } else {
      values.servingSize = num(amount);
      values.servingUnit = unit;
    }
    flag('servingSize', serving.confidence);
    flag('servingUnit', serving.confidence);
  }

  if (label.calories) {
    values.calories = num(label.calories.value);
    flag('calories', label.calories.confidence);
  }

  for (const [key, field] of Object.entries(NUTRIENT_FIELDS) as [
    LabelNutrient,
    keyof FoodFormValues,
  ][]) {
    const parsed = label.nutrients[key];
    if (!parsed) continue;
    values[field] = num(parsed.value);
    flag(field, parsed.confidence);
  }

  for (const field of CORE_FIELDS) {
    const filled =
      field === 'servingSize' || field === 'servingUnit' ? !!serving : values[field].trim() !== '';
    if (!filled) review.add(field);
  }

  const found = (label.calories ? 1 : 0) + Object.keys(label.nutrients).length;
  return { values, needsReview: [...review], looksEmpty: found < 3 };
}
