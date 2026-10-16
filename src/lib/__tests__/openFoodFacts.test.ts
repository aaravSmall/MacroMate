import { mapOffNutrition, mapOffProduct, type OffProduct } from '@/lib/openFoodFacts';

const base: OffProduct = {
  code: '0123456789012',
  product_name: 'Crunchy Granola',
  brands: 'Acme Foods, Acme Group',
};

describe('mapOffNutrition', () => {
  it('uses per-serving values when serving data exists', () => {
    const result = mapOffNutrition({
      ...base,
      serving_quantity: 45,
      nutriments: {
        'energy-kcal_serving': 200,
        proteins_serving: 5,
        carbohydrates_serving: 30,
        fat_serving: 7,
        sodium_serving: 0.12,
        fiber_serving: 3,
        'energy-kcal_100g': 444,
      },
    });
    expect(result).toEqual({
      serving: { size: 45, unit: 'g', grams: 45 },
      nutrition: {
        calories: 200,
        proteinG: 5,
        carbsG: 30,
        fatG: 7,
        micronutrients: { sodium_mg: 120, fiber_g: 3 },
      },
    });
  });

  it('falls back to per-100g with a 100 g serving', () => {
    const result = mapOffNutrition({
      ...base,
      nutriments: { 'energy-kcal_100g': 380, proteins_100g: '10.5', fat_100g: 4 },
    });
    expect(result?.serving).toEqual({ size: 100, unit: 'g', grams: 100 });
    expect(result?.nutrition).toMatchObject({ calories: 380, proteinG: 10.5, carbsG: 0, fatG: 4 });
  });

  it('converts kJ to kcal when kcal is missing', () => {
    const result = mapOffNutrition({ ...base, nutriments: { 'energy-kj_100g': 418.4 } });
    expect(result?.nutrition.calories).toBe(100);
  });

  it('ignores per-serving values without a serving quantity', () => {
    const result = mapOffNutrition({
      ...base,
      nutriments: { 'energy-kcal_serving': 999, 'energy-kcal_100g': 250 },
    });
    expect(result?.nutrition.calories).toBe(250);
  });

  it('converts minerals and vitamins to mg / mcg', () => {
    const result = mapOffNutrition({
      ...base,
      nutriments: {
        'energy-kcal_100g': 100,
        calcium_100g: 0.25,
        'vitamin-d_100g': 0.000002,
        cholesterol_100g: 0.03,
      },
    });
    expect(result?.nutrition.micronutrients).toEqual({
      calcium_mg: 250,
      vitamin_d_mcg: 2,
      cholesterol_mg: 30,
    });
  });

  it('returns null without calories', () => {
    expect(mapOffNutrition({ ...base, nutriments: { proteins_100g: 3 } })).toBeNull();
  });
});

describe('mapOffProduct', () => {
  it('maps to a Food with an off: id and the first brand', () => {
    const food = mapOffProduct({ ...base, nutriments: { 'energy-kcal_100g': 444 } });
    expect(food).toMatchObject({
      id: 'off:0123456789012',
      kind: 'food',
      name: 'Crunchy Granola',
      brand: 'Acme Foods',
      source: 'open_food_facts',
      externalId: '0123456789012',
      barcode: '0123456789012',
    });
  });

  it('falls back to generic_name', () => {
    const food = mapOffProduct({
      code: '1',
      product_name: '',
      generic_name: 'Oat cereal',
      nutriments: { 'energy-kcal_100g': 370 },
    });
    expect(food?.name).toBe('Oat cereal');
  });

  it('returns null without a code or name', () => {
    const nutriments = { 'energy-kcal_100g': 100 };
    expect(mapOffProduct({ product_name: 'x', nutriments })).toBeNull();
    expect(mapOffProduct({ code: '1', nutriments })).toBeNull();
  });
});
