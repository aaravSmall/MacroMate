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
  it('parses a valid form', () => {
    const result = parseFoodForm(valid);
    expect(result).toEqual({
      ok: true,
      input: {
        name: 'Protein bar',
        brand: 'Acme',
        restaurant: null,
        barcode: null,
        serving: { size: 1, unit: 'bar', grams: null },
        nutrition: {
          calories: 210,
          proteinG: 20,
          carbsG: 22.5,
          fatG: 0,
          micronutrients: { sodium_mg: 180 },
        },
      },
    });
  });

  it('records grams when the unit is g', () => {
    const result = parseFoodForm({ ...valid, servingSize: '40', servingUnit: 'g' });
    expect(result.ok && result.input.serving.grams).toBe(40);
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
