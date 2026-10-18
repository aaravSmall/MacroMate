import { mapOffNutrition, mapOffProduct, type OffProduct } from '@/lib/openFoodFacts';

const base: OffProduct = {
  code: '0123456789012',
  product_name: 'Crunchy Granola',
  brands: 'Acme Foods, Acme Group',
};

describe('mapOffNutrition', () => {
  it('stores per-100 g values, with the product serving as the default portion', () => {
    const result = mapOffNutrition({
      ...base,
      serving_size: '1 cup (45 g)',
      serving_quantity: 45,
      nutriments: {
        'energy-kcal_100g': 444,
        proteins_100g: 11,
        carbohydrates_100g: 66.7,
        fat_100g: 15.6,
        sodium_100g: 0.27,
        fiber_100g: 6.7,
        'energy-kcal_serving': 200,
      },
    });
    expect(result).toEqual({
      baseUnit: 'g',
      nutrition: {
        calories: 444,
        proteinG: 11,
        carbsG: 66.7,
        fatG: 15.6,
        micronutrients: { sodium_mg: 270, fiber_g: 6.7 },
      },
      servings: [
        { id: null, label: '1 cup (45 g)', baseMultiplier: 0.45, isDefault: true },
        { id: null, label: '100 g', baseMultiplier: 1, isDefault: false },
      ],
    });
  });

  it('scales per-serving values to 100 g when that is all OFF has', () => {
    const result = mapOffNutrition({
      ...base,
      serving_quantity: 50,
      nutriments: { 'energy-kcal_serving': 200, proteins_serving: 5 },
    });
    expect(result?.nutrition).toMatchObject({ calories: 400, proteinG: 10 });
    expect(result?.servings[0]).toMatchObject({ label: '50 g', baseMultiplier: 0.5 });
  });

  it('uses only a 100 g portion without a serving quantity', () => {
    const result = mapOffNutrition({
      ...base,
      nutriments: { 'energy-kcal_serving': 999, 'energy-kcal_100g': 250, proteins_100g: '10.5' },
    });
    expect(result?.nutrition).toMatchObject({ calories: 250, proteinG: 10.5, carbsG: 0, fatG: 0 });
    expect(result?.servings).toEqual([
      { id: null, label: '100 g', baseMultiplier: 1, isDefault: true },
    ]);
  });

  it('uses 100 ml for liquids', () => {
    const result = mapOffNutrition({
      ...base,
      serving_quantity: 250,
      serving_quantity_unit: 'ml',
      nutriments: { 'energy-kcal_100g': 42 },
    });
    expect(result?.baseUnit).toBe('ml');
    expect(result?.servings.map((s) => s.label)).toEqual(['250 ml', '100 ml']);
  });

  it('converts kJ to kcal when kcal is missing', () => {
    const result = mapOffNutrition({ ...base, nutriments: { 'energy-kj_100g': 418.4 } });
    expect(result?.nutrition.calories).toBe(100);
  });

  it('converts minerals and vitamins to mg / mcg and uses foods column keys', () => {
    const result = mapOffNutrition({
      ...base,
      nutriments: {
        'energy-kcal_100g': 100,
        calcium_100g: 0.25,
        'vitamin-d_100g': 0.000002,
        cholesterol_100g: 0.03,
        'saturated-fat_100g': 1.5,
      },
    });
    expect(result?.nutrition.micronutrients).toEqual({
      calcium_mg: 250,
      vitamin_d_mcg: 2,
      cholesterol_mg: 30,
      sat_fat_g: 1.5,
    });
  });

  it('returns null without calories', () => {
    expect(mapOffNutrition({ ...base, nutriments: { proteins_100g: 3 } })).toBeNull();
  });
});

describe('mapOffProduct', () => {
  it('maps to a public, unowned Food with an off: id and the first brand', () => {
    const food = mapOffProduct({ ...base, nutriments: { 'energy-kcal_100g': 444 } });
    expect(food).toMatchObject({
      id: 'off:0123456789012',
      ownerId: null,
      visibility: 'public',
      name: 'Crunchy Granola',
      brand: 'Acme Foods',
      source: 'open_food_facts',
      externalId: '0123456789012',
      barcode: '0123456789012',
      baseAmount: 100,
      baseUnit: 'g',
      verificationCount: 0,
      mismatchCount: 0,
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
