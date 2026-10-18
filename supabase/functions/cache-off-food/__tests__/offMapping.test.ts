import fixture from '../__fixtures__/off-3017620422003.json';
import iceCreamFlOzFixture from '../__fixtures__/off-076840100477-ice-cream-fl-oz.json';
import drinkFixture from '../__fixtures__/off-5449000000996-drink.json';
import iceCreamMlServingFixture from '../__fixtures__/off-8712100849084-ice-cream-ml-serving.json';
import { isLiquid, mapOffProductToRows, OFF_CODE_PATTERN, type OffProduct } from '../offMapping';

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

/** Saved responses, trimmed to our fields. */
const coke: OffProduct = drinkFixture.product; // "330 ml" can, serving "1 portion (330 ml)", per 100g(!)
const benAndJerrys: OffProduct = iceCreamFlOzFixture.product; // "16 fl oz" tub, serving "141 g"
const magnum: OffProduct = iceCreamMlServingFixture.product; // "292 g" box, serving "88ml"

describe('liquids', () => {
  it('stores a drink per 100 ml with ml servings, its can as the default', () => {
    const rows = mapOffProductToRows('5449000000996', coke);
    expect(rows?.food).toMatchObject({
      name: 'Coca-Cola Original',
      base_amount: 100,
      base_unit: 'ml',
      calories: 42.4,
      sugar_g: 10.6,
    });
    expect(rows?.servings).toEqual([
      { label: '1 portion (330 ml)', base_multiplier: 3.3, is_default: true },
      { label: '100 ml', base_multiplier: 1, is_default: false },
      { label: '1 ml', base_multiplier: 0.01, is_default: false },
      { label: '1 fl oz', base_multiplier: 0.2957, is_default: false },
      { label: '1 cup (240 ml)', base_multiplier: 2.4, is_default: false },
    ]);
  });

  it('makes 100 ml the default for a drink without a serving', () => {
    const rows = mapOffProductToRows('1', {
      ...coke,
      serving_size: undefined,
      serving_quantity: undefined,
      serving_quantity_unit: undefined,
      quantity: '1.5 l',
      product_quantity_unit: undefined,
    });
    expect(rows?.food.base_unit).toBe('ml');
    expect(rows?.servings[0]).toEqual({ label: '100 ml', base_multiplier: 1, is_default: true });
  });

  it('trusts nutrition_data_per = 100ml even without other volume hints', () => {
    expect(isLiquid({ nutrition_data_per: '100ml', quantity: '1 kg' })).toBe(true);
  });

  it('keeps ice cream in a fl oz tub solid when its serving is in grams', () => {
    const rows = mapOffProductToRows('076840100477', benAndJerrys);
    expect(rows?.food.base_unit).toBe('g');
    expect(rows?.servings[0]).toEqual({
      label: '1 serving (141 g)',
      base_multiplier: 1.41,
      is_default: true,
    });
    expect(rows?.servings.map((s) => s.label)).toEqual([
      '1 serving (141 g)',
      '100 g',
      '1 g',
      '1 oz',
    ]);
  });

  it('keeps a gram-packaged product solid and drops its ml serving', () => {
    const rows = mapOffProductToRows('8712100849084', magnum);
    expect(rows?.food.base_unit).toBe('g');
    expect(rows?.servings[0]).toEqual({ label: '100 g', base_multiplier: 1, is_default: true });
    expect(rows?.servings.some((s) => /ml/.test(s.label))).toBe(false);
  });

  it('classifies the fixtures and unit hints', () => {
    expect(isLiquid(coke)).toBe(true);
    expect(isLiquid(benAndJerrys)).toBe(false);
    expect(isLiquid(magnum)).toBe(false);
    expect(isLiquid(nutella)).toBe(false);
    expect(isLiquid({ quantity: '12 fl oz' })).toBe(true);
    expect(isLiquid({ quantity: '33 cl', serving_quantity_unit: 'ml' })).toBe(true);
    expect(isLiquid({ quantity: '500 g', serving_quantity_unit: 'ml' })).toBe(false);
    expect(isLiquid({ quantity: 'Pack of 6' })).toBe(false);
  });
});
