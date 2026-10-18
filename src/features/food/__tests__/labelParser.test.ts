import {
  caloriesMatchMacros,
  type LabelNutrient,
  type ParsedLabel,
  parseNutritionLabel,
} from '@/features/food/logic/labelParser';

import { VISION_DRINK, VISION_STANDARD } from '../__fixtures__/visionOcr';

/** Value of a nutrient, for terse assertions. */
const v = (label: ParsedLabel, key: LabelNutrient) => label.nutrients[key]?.value;
const conf = (label: ParsedLabel, key: LabelNutrient) => label.nutrients[key]?.confidence;

// Realistic OCR output: line breaks where text recognition puts them, %DV columns included.

const STANDARD = `Nutrition Facts
8 servings per container
Serving size 2/3 cup (55g)
Amount per serving
Calories 230
% Daily Value*
Total Fat 8g 10%
Saturated Fat 1g 5%
Trans Fat 0g
Cholesterol 0mg 0%
Sodium 160mg 7%
Total Carbohydrate 37g 13%
Dietary Fiber 4g 14%
Total Sugars 12g
Includes 10g Added Sugars 20%
Protein 3g
Vitamin D 2mcg 10%
Calcium 260mg 20%
Iron 8mg 45%
Potassium 240mg 6%
*The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet.`;

const DUAL_COLUMN = `Nutrition Facts
2.5 servings per container
Serving size 1 oz (28g/About 15 chips)
Per serving Per container
Calories 160 400
% DV* % DV*
Total Fat 10g 13% 25g 32%
Saturated Fat 1.5g 8% 3.5g 18%
Trans Fat 0g 0g
Cholesterol 0mg 0% 0mg 0%
Sodium 170mg 7% 420mg 18%
Total Carb. 15g 5% 37g 13%
Dietary Fiber 1g 4% 3g 11%
Total Sugars <1g 1g
Incl. 0g Added Sugars 0% 0g 0%
Protein 2g 5g`;

const LINEAR = `Nutrition Facts Servings: 12, Serv. size: 1 bar (40g), Amount per serving: Calories 190, Total Fat 7g (9% DV), Sat. Fat 3g (15% DV), Trans Fat 0g, Cholest. 0mg (0% DV), Sodium 125mg (5% DV), Total Carb. 29g (11% DV), Fiber 2g (7% DV), Total Sugars 12g (Incl. 11g Added Sugars, 22% DV), Protein 3g, Vit. D (0% DV), Calcium (2% DV), Iron (6% DV), Potas. 90mg (2% DV).`;

const DRINK_ML = `Nutrition Facts
1 serving per container
Serving size 1 can (355 mL)
Calories 140
% Daily Value*
Total Fat 0g 0%
Sodium 45mg 2%
Total Carbohydrate 39g 14%
Total Sugars 39g
Includes 39g Added Sugars 78%
Protein 0g`;

const NOISY = `Nutritlon Facts
About 6 servings per container
Serving size 1 cup (3Og)
Ca1ories 12O
Total Fat 2.5 9 3%
Saturated Fat O g O%
Trans Fat Og
Cholesterol Om g 0%
Sodium l90m g 8%
Total Carbohydrate 22g 8%
Dietary Fiber 3g 11%
Total Sugars l g
Includes Og Added Sugars 0%
Protein 3g`;

const OLD_STYLE = `Nutrition Facts
Serving Size 1 cup (228g)
Servings Per Container 2
Amount Per Serving
Calories 250 Calories from Fat 110
% Daily Value*
Total Fat 12g 18%
Saturated Fat 3g 15%
Trans Fat 3g
Cholesterol 30mg 10%
Sodium 470mg 20%
Total Carbohydrate 31g 10%
Dietary Fiber 0g 0%
Sugars 5g
Protein 5g
Vitamin A 4% Vitamin C 2%
Calcium 20% Iron 4%`;

const MICROS = `Nutrition Facts
Serving size 1 cup (240mL)
Calories 90
Total Fat 0g 0%
Cholesterol <5mg 1%
Sodium 130mg 6%
Total Carbohydrate 12g 4%
Total Sugars 12g
Includes 0g Added Sugars 0%
Protein 8g 16%
Vitamin D 2.9mcg 15%
Calcium 300mg 25%
Iron 0mg 0%
Potassium 400mg 8%
Magnesium 25mg 6%
Zinc 1.1mg 10%`;

const SMALL_PACKAGE = `Nutrition Facts Serving size 1 package (14g) Calories 70 Total Fat 4g (5% DV), Sat. Fat 2g (10% DV), Trans Fat 0g, Sodium 15mg (1% DV), Total Carb. 8g (3% DV), Total Sugars 7g (Incl. 7g Added Sugars, 14% DV), Protein 1g. Not a significant source of cholesterol, dietary fiber, vitamin D, calcium, iron and potassium.`;

const UNICODE_FRACTION_AND_COMMAS = `Nutrition Facts
about 4 servings per container
Serving size ½ cup (120 g)
Calories 1,100
Total Fat 60g 77%
Saturated Fat 20g 100%
Sodium 1,200mg 52%
Total Carbohydrate 110g 40%
Protein 25g`;

describe('parseNutritionLabel: standard vertical label', () => {
  const label = parseNutritionLabel(STANDARD);

  it('reads serving size with household amount and grams', () => {
    expect(label.servingSize).toEqual({
      value: { amount: 0.67, unit: 'cup', grams: 55, ml: null, text: '2/3 cup (55g)' },
      confidence: 'high',
    });
    expect(label.servingsPerContainer).toEqual({ value: 8, confidence: 'high' });
  });

  it('reads calories and every nutrient, ignoring %DV', () => {
    expect(label.calories).toEqual({ value: 230, confidence: 'high' });
    expect(label.nutrients).toEqual({
      fat_g: { value: 8, confidence: 'high' },
      sat_fat_g: { value: 1, confidence: 'high' },
      trans_fat_g: { value: 0, confidence: 'high' },
      cholesterol_mg: { value: 0, confidence: 'high' },
      sodium_mg: { value: 160, confidence: 'high' },
      carbs_g: { value: 37, confidence: 'high' },
      fiber_g: { value: 4, confidence: 'high' },
      sugar_g: { value: 12, confidence: 'high' },
      added_sugar_g: { value: 10, confidence: 'high' },
      protein_g: { value: 3, confidence: 'high' },
      vitamin_d_mcg: { value: 2, confidence: 'high' },
      calcium_mg: { value: 260, confidence: 'high' },
      iron_mg: { value: 8, confidence: 'high' },
      potassium_mg: { value: 240, confidence: 'high' },
    });
  });
});

describe('parseNutritionLabel: dual-column label', () => {
  const label = parseNutritionLabel(DUAL_COLUMN);

  it('takes the per-serving column', () => {
    expect(label.calories?.value).toBe(160);
    expect(v(label, 'fat_g')).toBe(10);
    expect(v(label, 'sat_fat_g')).toBe(1.5);
    expect(v(label, 'sodium_mg')).toBe(170);
    expect(v(label, 'carbs_g')).toBe(15);
    expect(v(label, 'protein_g')).toBe(2);
    expect(v(label, 'added_sugar_g')).toBe(0);
  });

  it('reads decimal servings per container and grams inside the serving text', () => {
    expect(label.servingsPerContainer?.value).toBe(2.5);
    expect(label.servingSize?.value).toMatchObject({ amount: 1, unit: 'oz', grams: 28 });
  });

  it('marks "<1g" as low confidence for review', () => {
    expect(label.nutrients.sugar_g).toEqual({ value: 1, confidence: 'low' });
  });
});

describe('parseNutritionLabel: linear label', () => {
  const label = parseNutritionLabel(LINEAR);

  it('reads fields from one run-on line', () => {
    expect(label.servingsPerContainer?.value).toBe(12);
    expect(label.servingSize?.value).toMatchObject({ amount: 1, unit: 'bar', grams: 40 });
    expect(label.calories?.value).toBe(190);
    expect(v(label, 'fat_g')).toBe(7);
    expect(v(label, 'sat_fat_g')).toBe(3);
    expect(v(label, 'cholesterol_mg')).toBe(0);
    expect(v(label, 'carbs_g')).toBe(29);
    expect(v(label, 'fiber_g')).toBe(2);
    expect(v(label, 'sugar_g')).toBe(12);
    expect(v(label, 'added_sugar_g')).toBe(11);
    expect(v(label, 'protein_g')).toBe(3);
    expect(v(label, 'potassium_mg')).toBe(90);
  });

  it('converts %DV-only minerals with low confidence', () => {
    expect(label.nutrients.calcium_mg).toEqual({ value: 26, confidence: 'low' });
    expect(label.nutrients.iron_mg).toEqual({ value: 1.08, confidence: 'low' });
    expect(label.nutrients.vitamin_d_mcg).toEqual({ value: 0, confidence: 'low' });
  });
});

describe('parseNutritionLabel: drink in ml', () => {
  const label = parseNutritionLabel(DRINK_ML);

  it('reads the ml serving', () => {
    expect(label.servingSize?.value).toEqual({
      amount: 1,
      unit: 'can',
      grams: null,
      ml: 355,
      text: '1 can (355 ml)',
    });
    expect(label.servingsPerContainer?.value).toBe(1);
  });

  it('reads the drink nutrients', () => {
    expect(label.calories?.value).toBe(140);
    expect(v(label, 'sodium_mg')).toBe(45);
    expect(v(label, 'carbs_g')).toBe(39);
    expect(v(label, 'sugar_g')).toBe(39);
    expect(v(label, 'added_sugar_g')).toBe(39);
    expect(v(label, 'protein_g')).toBe(0);
  });
});

describe('parseNutritionLabel: noisy OCR', () => {
  const label = parseNutritionLabel(NOISY);

  it('repairs O→0, l→1, split units, and 9→g with medium confidence', () => {
    expect(label.calories).toEqual({ value: 120, confidence: 'medium' });
    expect(label.servingSize?.value).toMatchObject({ amount: 1, unit: 'cup', grams: 30 });
    expect(label.nutrients.fat_g).toEqual({ value: 2.5, confidence: 'medium' });
    expect(label.nutrients.sat_fat_g).toEqual({ value: 0, confidence: 'medium' });
    expect(label.nutrients.trans_fat_g).toEqual({ value: 0, confidence: 'medium' });
    expect(label.nutrients.cholesterol_mg).toEqual({ value: 0, confidence: 'medium' });
    expect(label.nutrients.sodium_mg).toEqual({ value: 190, confidence: 'medium' });
    expect(label.nutrients.sugar_g).toEqual({ value: 1, confidence: 'medium' });
    expect(label.nutrients.added_sugar_g).toEqual({ value: 0, confidence: 'medium' });
  });

  it('keeps clean fields at high confidence', () => {
    expect(conf(label, 'carbs_g')).toBe('high');
    expect(conf(label, 'protein_g')).toBe('high');
    expect(label.servingsPerContainer).toEqual({ value: 6, confidence: 'medium' });
  });
});

describe('parseNutritionLabel: old-style label', () => {
  const label = parseNutritionLabel(OLD_STYLE);

  it('skips "Calories from Fat"', () => {
    expect(label.calories?.value).toBe(250);
  });

  it('reads "Servings Per Container 2" and plain "Sugars"', () => {
    expect(label.servingsPerContainer?.value).toBe(2);
    expect(v(label, 'sugar_g')).toBe(5);
    expect(v(label, 'trans_fat_g')).toBe(3);
    expect(v(label, 'fat_g')).toBe(12);
  });

  it('converts %DV-only calcium and iron with low confidence, and ignores vitamins A/C', () => {
    expect(label.nutrients.calcium_mg).toEqual({ value: 260, confidence: 'low' });
    expect(label.nutrients.iron_mg).toEqual({ value: 0.72, confidence: 'low' });
    expect(Object.keys(label.nutrients)).not.toContain('vitamin_a');
  });
});

describe('parseNutritionLabel: printed micronutrients', () => {
  const label = parseNutritionLabel(MICROS);

  it('reads every printed mineral and vitamin D in its unit', () => {
    expect(v(label, 'vitamin_d_mcg')).toBe(2.9);
    expect(v(label, 'calcium_mg')).toBe(300);
    expect(v(label, 'iron_mg')).toBe(0);
    expect(v(label, 'potassium_mg')).toBe(400);
    expect(v(label, 'magnesium_mg')).toBe(25);
    expect(v(label, 'zinc_mg')).toBe(1.1);
  });

  it('flags "<5mg" cholesterol for review and reads the ml serving', () => {
    expect(label.nutrients.cholesterol_mg).toEqual({ value: 5, confidence: 'low' });
    expect(label.servingSize?.value).toMatchObject({ amount: 1, unit: 'cup', ml: 240 });
  });
});

describe('parseNutritionLabel: small package', () => {
  const label = parseNutritionLabel(SMALL_PACKAGE);

  it('reads a run-on small label and leaves unlisted nutrients out', () => {
    expect(label.servingSize?.value).toMatchObject({ amount: 1, unit: 'package', grams: 14 });
    expect(label.calories?.value).toBe(70);
    expect(v(label, 'fat_g')).toBe(4);
    expect(v(label, 'sat_fat_g')).toBe(2);
    expect(v(label, 'added_sugar_g')).toBe(7);
    expect(v(label, 'protein_g')).toBe(1);
    // "Not a significant source of cholesterol, dietary fiber, …" has no amounts.
    expect(label.nutrients.cholesterol_mg).toBeUndefined();
    expect(label.nutrients.fiber_g).toBeUndefined();
    expect(label.nutrients.iron_mg).toBeUndefined();
  });
});

describe('parseNutritionLabel: fractions and thousands separators', () => {
  const label = parseNutritionLabel(UNICODE_FRACTION_AND_COMMAS);

  it('handles ½ and 1,200', () => {
    expect(label.servingSize?.value).toMatchObject({ amount: 0.5, unit: 'cup', grams: 120 });
    expect(label.calories?.value).toBe(1100);
    expect(v(label, 'sodium_mg')).toBe(1200);
    expect(label.servingsPerContainer).toEqual({ value: 4, confidence: 'medium' });
  });
});

describe('calorie cross-check', () => {
  it('lowers calorie confidence when macros disagree (misread digit)', () => {
    const label = parseNutritionLabel(STANDARD.replace('Calories 230', 'Calories 830'));
    expect(label.calories).toEqual({ value: 830, confidence: 'low' });
  });

  it('accepts labels within 20% of 4/4/9', () => {
    expect(caloriesMatchMacros(230, { proteinG: 3, carbsG: 37, fatG: 8 })).toBe(true);
    expect(caloriesMatchMacros(140, { proteinG: 0, carbsG: 39, fatG: 0 })).toBe(true);
    expect(caloriesMatchMacros(400, { proteinG: 3, carbsG: 37, fatG: 8 })).toBe(false);
  });
});

it('returns empty results for text that is not a label', () => {
  expect(parseNutritionLabel('Grilled chicken salad with avocado')).toEqual({
    servingSize: null,
    servingsPerContainer: null,
    calories: null,
    nutrients: {},
  });
});

describe('real Apple Vision output (column-split)', () => {
  it('finds calories and serving size on their own lines (medium confidence)', () => {
    const label = parseNutritionLabel(VISION_STANDARD);
    expect(label.calories).toEqual({ value: 230, confidence: 'medium' });
    expect(label.servingSize).toEqual({
      value: { amount: 0.67, unit: 'cup', grams: 55, ml: null, text: '2/3 cup (55g)' },
      confidence: 'medium',
    });
    expect(label.servingsPerContainer?.value).toBe(8);
    expect(v(label, 'fat_g')).toBe(8);
    expect(v(label, 'sodium_mg')).toBe(160);
    expect(v(label, 'added_sugar_g')).toBe(10);
    expect(v(label, 'potassium_mg')).toBe(240);
    expect(conf(label, 'protein_g')).toBe('high');
  });

  it('reads the drink label', () => {
    const label = parseNutritionLabel(VISION_DRINK);
    expect(label.calories?.value).toBe(140);
    expect(label.servingSize?.value).toMatchObject({ amount: 1, unit: 'can', ml: 355 });
    expect(v(label, 'carbs_g')).toBe(39);
    expect(v(label, 'added_sugar_g')).toBe(39);
  });
});
