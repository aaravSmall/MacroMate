import { EMPTY_FOOD_FORM, parseFoodForm } from '@/features/food/logic/foodForm';

const valid = {
  ...EMPTY_FOOD_FORM,
  name: '  Protein bar ',
  brand: 'Acme',
  servingSize: '1',
  servingUnit: 'bar',
  calories: '210',
  protein: '20',
  carbs: '22,5',
  fat: '',
  sodium: '180',
};

describe('parseFoodForm', () => {
  it('stores a count-based serving per 1 serving', () => {
    const result = parseFoodForm(valid);
    expect(result).toEqual({
      ok: true,
      input: {
        source: 'user_product',
        name: 'Protein bar',
        brand: 'Acme',
        barcode: null,
        baseAmount: 1,
        baseUnit: 'serving',
        nutrition: {
          calories: 210,
          proteinG: 20,
          carbsG: 22.5,
          fatG: 0,
          micronutrients: { sodium_mg: 180 },
        },
        servings: [{ label: '1 bar', baseMultiplier: 1, isDefault: true }],
      },
    });
  });

  it('stores a gram serving per 100 g, with the label serving as a portion', () => {
    const result = parseFoodForm({ ...valid, servingSize: '40', servingUnit: 'g' });
    if (!result.ok) throw new Error('expected a valid form');
    expect(result.input).toMatchObject({
      baseAmount: 100,
      baseUnit: 'g',
      nutrition: {
        calories: 525,
        proteinG: 50,
        carbsG: 56.25,
        fatG: 0,
        micronutrients: { sodium_mg: 450 },
      },
      servings: [{ label: '40 g', baseMultiplier: 0.4, isDefault: true }],
    });
  });

  it('maps saturated fat to its foods column key', () => {
    const result = parseFoodForm({ ...valid, saturatedFat: '3' });
    expect(result.ok && result.input.nutrition.micronutrients.sat_fat_g).toBe(3);
  });

  it('requires name, serving, and calories', () => {
    const result = parseFoodForm({ ...EMPTY_FOOD_FORM, servingSize: '0', servingUnit: ' ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        'calories',
        'name',
        'servingSize',
        'servingUnit',
      ]);
    }
  });

  it('rejects negative and non-numeric values', () => {
    const result = parseFoodForm({ ...valid, calories: '-5', protein: 'abc', fiber: '-1' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.calories).toBeDefined();
      expect(result.errors.protein).toBeDefined();
      expect(result.errors.fiber).toBeDefined();
    }
  });

  it('allows zero-calorie foods', () => {
    expect(parseFoodForm({ ...valid, calories: '0' }).ok).toBe(true);
  });
});
