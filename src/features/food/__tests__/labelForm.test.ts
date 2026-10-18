import { EMPTY_FOOD_FORM, parseFoodForm } from '@/features/food/logic/foodForm';
import { labelToFoodForm } from '@/features/food/logic/labelForm';
import { parseNutritionLabel } from '@/features/food/logic/labelParser';

const LABEL = `Nutrition Facts
8 servings per container
Serving size 2/3 cup (55g)
Calories 230
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
Potassium 240mg 6%`;

describe('labelToFoodForm', () => {
  it('prefills every field, using the printed grams as the serving', () => {
    const { values, needsReview, looksEmpty } = labelToFoodForm(
      parseNutritionLabel(LABEL),
      EMPTY_FOOD_FORM,
    );
    expect(values).toMatchObject({
      name: '',
      servingSize: '55',
      servingUnit: 'g',
      calories: '230',
      fat: '8',
      saturatedFat: '1',
      transFat: '0',
      cholesterol: '0',
      sodium: '160',
      carbs: '37',
      fiber: '4',
      sugar: '12',
      addedSugar: '10',
      protein: '3',
      vitaminD: '2',
      calcium: '260',
      iron: '8',
      potassium: '240',
    });
    // A clean label only needs the name.
    expect(needsReview).toEqual(['name']);
    expect(looksEmpty).toBe(false);
  });

  it('flags repaired, low-confidence, and missing core fields', () => {
    const noisy = LABEL.replace('Calories 230', 'Ca1ories 23O')
      .replace('Sodium 160mg', 'Sodium l60m g')
      .replace('Protein 3g\n', '')
      .replace('Cholesterol 0mg', 'Cholesterol <5mg');
    const { values, needsReview } = labelToFoodForm(parseNutritionLabel(noisy), EMPTY_FOOD_FORM);
    expect(values.calories).toBe('230');
    expect(values.sodium).toBe('160');
    expect(needsReview).toEqual(
      expect.arrayContaining(['name', 'calories', 'sodium', 'cholesterol', 'protein']),
    );
    expect(needsReview).not.toContain('fat');
  });

  it('uses the household measure when no grams or ml are printed', () => {
    const { values } = labelToFoodForm(
      parseNutritionLabel(
        'Serving size 1 bar\nCalories 190\nTotal Fat 7g\nProtein 3g\nTotal Carb. 29g',
      ),
      EMPTY_FOOD_FORM,
    );
    expect(values).toMatchObject({ servingSize: '1', servingUnit: 'bar' });
  });

  it('uses ml for drinks', () => {
    const { values } = labelToFoodForm(
      parseNutritionLabel('Serving size 1 can (355 mL)\nCalories 140\nTotal Carbohydrate 39g'),
      EMPTY_FOOD_FORM,
    );
    expect(values).toMatchObject({ servingSize: '355', servingUnit: 'ml' });
  });

  it('says when a photo probably was not a label', () => {
    expect(labelToFoodForm(parseNutritionLabel('chicken salad'), EMPTY_FOOD_FORM).looksEmpty).toBe(
      true,
    );
  });

  it('round-trips into a label_scan food via the existing validation', () => {
    const { values } = labelToFoodForm(parseNutritionLabel(LABEL), EMPTY_FOOD_FORM);
    const unnamed = parseFoodForm(values, { source: 'label_scan' });
    expect(unnamed.ok).toBe(false); // the name is required
    const parsed = parseFoodForm({ ...values, name: 'Granola' }, { source: 'label_scan' });
    if (!parsed.ok) throw new Error('expected a valid form');
    expect(parsed.input).toMatchObject({
      source: 'label_scan',
      name: 'Granola',
      baseAmount: 100,
      baseUnit: 'g',
      servings: [{ label: '55 g', baseMultiplier: 0.55, isDefault: true }],
    });
    // 230 kcal per 55 g → 418.18 per 100 g; minerals carried into micronutrients.
    expect(parsed.input.nutrition.calories).toBe(418.18);
    expect(parsed.input.nutrition.micronutrients).toMatchObject({
      added_sugar_g: 18.18,
      trans_fat_g: 0,
      vitamin_d_mcg: 3.64,
      calcium_mg: 472.73,
    });
  });
});
