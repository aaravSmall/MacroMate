import fixture from '../__fixtures__/off-3017620422003.json';
import { mapOffProductToRows, OFF_CODE_PATTERN, type OffProduct } from '../offMapping';

/** Saved response from GET /api/v2/product/3017620422003.json (Nutella), trimmed to our fields. */
const nutella: OffProduct = fixture.product;
const CODE = '3017620422003';

describe('mapOffProductToRows', () => {
  it('maps the saved product to a public, unowned global food per 100 g', () => {
    const rows = mapOffProductToRows(CODE, nutella);
    expect(rows?.food).toEqual({
      source: 'open_food_facts',
      visibility: 'public',
      owner_id: null,
      external_id: CODE,
      barcode: CODE,
      name: 'Nutella',
      brand: 'Nutella',
      base_amount: 100,
      base_unit: 'g',
      calories: 539,
      protein_g: 6.3,
      carbs_g: 57.5,
      fat_g: 30.9,
      fiber_g: 0,
      sugar_g: 56.3,
      sat_fat_g: 10.6,
      sodium_mg: 42.8, // 0.0428 g × 1000
      cholesterol_mg: null,
      micros: {},
    });
  });

  it('makes 100 g the default when OFF has no serving', () => {
    expect(mapOffProductToRows(CODE, nutella)?.servings).toEqual([
      { label: '100 g', base_multiplier: 1, is_default: true },
      { label: '1 g', base_multiplier: 0.01, is_default: false },
      { label: '1 oz', base_multiplier: 0.283495, is_default: false },
    ]);
  });

  it("adds the product's gram serving as the default", () => {
    const rows = mapOffProductToRows(CODE, {
      ...nutella,
      serving_size: '1 portion (15 g)',
      serving_quantity: '15',
    });
    expect(rows?.servings).toEqual([
      { label: '1 portion (15 g)', base_multiplier: 0.15, is_default: true },
      { label: '100 g', base_multiplier: 1, is_default: false },
      { label: '1 g', base_multiplier: 0.01, is_default: false },
      { label: '1 oz', base_multiplier: 0.283495, is_default: false },
    ]);
  });

  it('skips a serving that is not in grams or has no label', () => {
    const ml = mapOffProductToRows(CODE, {
      ...nutella,
      serving_size: '250 ml',
      serving_quantity: 250,
      serving_quantity_unit: 'ml',
    });
    expect(ml?.servings[0]).toMatchObject({ label: '100 g', is_default: true });
    const unlabeled = mapOffProductToRows(CODE, { ...nutella, serving_quantity: 15 });
    expect(unlabeled?.servings).toHaveLength(3);
  });

  it('converts sodium, cholesterol, and minerals from grams to mg', () => {
    const rows = mapOffProductToRows(CODE, {
      ...nutella,
      nutriments: {
        ...nutella.nutriments,
        cholesterol_100g: 0.012,
        potassium_100g: '0.407',
        calcium_100g: 0.12,
        iron_100g: 0.0042,
        magnesium_100g: 0.065,
        zinc_100g: 0.0011,
        'vitamin-c_100g': 0.01,
      },
    });
    expect(rows?.food.cholesterol_mg).toBe(12);
    expect(rows?.food.micros).toEqual({
      potassium_mg: 407,
      calcium_mg: 120,
      iron_mg: 4.2,
      magnesium_mg: 65,
      zinc_mg: 1.1,
    });
  });

  it('leaves missing optional nutrients null and missing macros 0', () => {
    const rows = mapOffProductToRows(CODE, { ...nutella, nutriments: { 'energy-kcal_100g': 42 } });
    expect(rows?.food).toMatchObject({
      calories: 42,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: null,
      sugar_g: null,
      sat_fat_g: null,
      sodium_mg: null,
      cholesterol_mg: null,
      micros: {},
    });
  });

  it('falls back to generic_name, then needs some name', () => {
    expect(mapOffProductToRows(CODE, { ...nutella, product_name: '  ' })?.food.name).toBe(
      'Pâte à tartiner aux noisettes et au cacao',
    );
    expect(
      mapOffProductToRows(CODE, { ...nutella, product_name: '', generic_name: undefined }),
    ).toBeNull();
  });

  it('has no brand when brands is empty', () => {
    expect(mapOffProductToRows(CODE, { ...nutella, brands: '' })?.food.brand).toBeNull();
  });

  it('returns null without energy-kcal_100g, even with kJ', () => {
    const { 'energy-kcal_100g': _kcal, ...rest } = nutella.nutriments ?? {};
    expect(rest['energy-kj_100g']).toBeDefined();
    expect(mapOffProductToRows(CODE, { ...nutella, nutriments: rest })).toBeNull();
  });

  it('ignores negative or non-numeric values', () => {
    const rows = mapOffProductToRows(CODE, {
      ...nutella,
      nutriments: { 'energy-kcal_100g': 100, proteins_100g: -3, fat_100g: 'n/a' },
    });
    expect(rows?.food).toMatchObject({ protein_g: 0, fat_g: 0 });
  });
});

describe('OFF_CODE_PATTERN', () => {
  it('accepts 4–14 digits only', () => {
    expect(OFF_CODE_PATTERN.test('1234')).toBe(true);
    expect(OFF_CODE_PATTERN.test(CODE)).toBe(true);
    expect(OFF_CODE_PATTERN.test('12345678901234')).toBe(true);
    expect(OFF_CODE_PATTERN.test('123')).toBe(false);
    expect(OFF_CODE_PATTERN.test('123456789012345')).toBe(false);
    expect(OFF_CODE_PATTERN.test('12a4')).toBe(false);
    expect(OFF_CODE_PATTERN.test(' 1234')).toBe(false);
  });
});
