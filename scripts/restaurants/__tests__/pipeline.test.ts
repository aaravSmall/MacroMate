import { CHIPOTLE_ROWS, FIVE_GUYS_ROWS, WINGSTOP_ROWS } from '../__fixtures__/rows';
import { chipotle } from '../chains/chipotle';
import { fiveguys } from '../chains/fiveguys';
import { wingstop } from '../chains/wingstop';
import { normalizeRecords, parseServing, parseValue, slug } from '../lib/normalize';
import { buildColumns, extractRecords, fieldsInLabel } from '../lib/table';
import { isStandardPortion, macroMismatch, uploadBlockers, validateItems } from '../lib/validate';

describe('fieldsInLabel', () => {
  it('reads multi-word and combined header labels', () => {
    expect(fieldsInLabel('Total Fat g')).toEqual(['fat_g']);
    expect(fieldsInLabel('Saturated Fat g')).toEqual(['sat_fat_g']);
    expect(fieldsInLabel('Calories From Fat')).toEqual(['calories_from_fat']);
    expect(fieldsInLabel('Add Sugars g')).toEqual(['added_sugar_g']);
    expect(fieldsInLabel('Sugars (g) Protein (g)')).toEqual(['sugar_g', 'protein_g']);
    expect(fieldsInLabel('Vitamin D mcg')).toEqual(['vitamin_d_mcg']);
    expect(fieldsInLabel('Serving Size (g)')).toEqual(['serving']);
    expect(fieldsInLabel('Milk')).toEqual([]);
  });
});

describe('Wingstop (multi-line headers, split section titles)', () => {
  const records = extractRecords(WINGSTOP_ROWS);

  it('joins "BONELESS" with "WINGS" from inside the header', () => {
    expect([...new Set(records.map((r) => r.section))]).toEqual([
      'CLASSIC WINGS',
      'BONELESS WINGS',
    ]);
  });

  it('maps every column, including vitamin D and potassium', () => {
    expect(records[0]).toMatchObject({
      name: 'Atomic',
      serving: '1ea (38.77g)',
      layoutMismatch: false,
      values: {
        calories: '90',
        fat_g: '5',
        sat_fat_g: '1.5',
        trans_fat_g: '0',
        cholesterol_mg: '45',
        sodium_mg: '220',
        carbs_g: '1',
        fiber_g: '0',
        sugar_g: '0',
        added_sugar_g: '0',
        protein_g: '10',
        vitamin_d_mcg: '0',
        calcium_mg: '10',
        iron_mg: '0',
        potassium_mg: '94',
      },
    });
  });

  it('normalizes to chain-prefixed names, per-wing servings, and wing counts', () => {
    const [atomic] = normalizeRecords(wingstop, records);
    expect(atomic).toMatchObject({
      externalId: 'wingstop:classic-wings:atomic',
      food: {
        name: 'Wingstop – Atomic Classic Wings',
        brand: 'Wingstop',
        source: 'restaurant',
        visibility: 'public',
        owner_id: null,
        base_amount: 1,
        base_unit: 'serving',
        calories: 90,
        protein_g: 10,
        sodium_mg: 220,
        micros: {
          trans_fat_g: 0,
          added_sugar_g: 0,
          vitamin_d_mcg: 0,
          calcium_mg: 10,
          iron_mg: 0,
          potassium_mg: 94,
        },
      },
    });
    expect(atomic?.servings.map((s) => [s.label, s.base_multiplier, s.is_default])).toEqual([
      ['1 wing (39 g)', 1, true],
      ['6 pc', 6, false],
      ['8 pc', 8, false],
      ['10 pc', 10, false],
      ['15 pc', 15, false],
      ['1 oz', 0.7312, false],
      ['100 g', 2.5793, false],
    ]);
  });

  it('keeps classic and boneless flavors apart', () => {
    const ids = normalizeRecords(wingstop, records).map((i) => i.externalId);
    expect(ids).toContain('wingstop:boneless-wings:atomic');
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Five Guys (disclaimer above header, combined header cell, grams column)', () => {
  const records = extractRecords(FIVE_GUYS_ROWS);

  it('ignores the disclaimer paragraph and reads every row in column order', () => {
    expect(records.every((r) => !r.layoutMismatch)).toBe(true);
    expect(records[0]).toMatchObject({
      section: 'MEAT',
      name: 'Bacon (2 pieces) (Supplier S)',
      servingAmount: { value: 14, unit: 'g' },
      values: {
        calories: '70',
        calories_from_fat: '50',
        fat_g: '6',
        sodium_mg: '210',
        sugar_g: '0',
        protein_g: '5',
      },
    });
  });

  it('picks up sections below the header', () => {
    expect([...new Set(records.map((r) => r.section))]).toEqual([
      'MEAT',
      'BUN',
      'FRIES - COOKED IN 100% PEANUT OIL',
    ]);
  });

  it('strips supplier tags, flags differing repeats, and names fries', () => {
    const items = normalizeRecords(fiveguys, records);
    const bacon = items.filter((i) => i.food.name === 'Five Guys – Bacon (2 pieces)');
    expect(bacon).toHaveLength(2);
    expect(bacon[0]?.reasons).toEqual([]);
    expect(bacon[1]?.reasons[0]).toMatch(/Duplicate/);
    expect(bacon[0]?.servings[0]?.label).toBe('2 pieces (14 g)');
    expect(items.map((i) => i.food.name)).toContain('Five Guys – Little Five Guys Style Fries');
  });
});

describe('Chipotle (text portions, size-variant rows)', () => {
  const records = extractRecords(CHIPOTLE_ROWS);

  it('reads portions and inherits the name for size variants', () => {
    expect(records[0]).toMatchObject({ name: 'Flour Tortilla (burrito)', serving: '1 ea' });
    const variant = records.find((r) => r.continued);
    expect(variant).toMatchObject({
      name: "Barq's Root Beer",
      serving: '32 fl oz',
      values: { calories: '430' },
    });
  });

  it('gives each size its own item and natural key', () => {
    const items = normalizeRecords(chipotle, records);
    const rootBeer = items.filter((i) => i.food.name.startsWith("Chipotle – Barq's Root Beer"));
    expect(rootBeer.map((i) => [i.externalId, i.servings[0]?.label])).toEqual([
      ['chipotle:menu:barq-s-root-beer', '22 fl oz'],
      ['chipotle:menu:barq-s-root-beer:32-fl-oz', '32 fl oz'],
    ]);
  });
});

describe('normalize helpers', () => {
  it('parses "<1" as 0.5 and plain numbers', () => {
    expect(parseValue('<1')).toBe(0.5);
    expect(parseValue('< 1')).toBe(0.5);
    expect(parseValue('12.5')).toBe(12.5);
    expect(parseValue(undefined)).toBeNull();
  });

  it('turns serving text into standard units', () => {
    expect(parseServing('1ea (38.77g)', null, 'wing')).toEqual({
      label: '1 wing (39 g)',
      grams: 38.77,
      ml: null,
    });
    expect(parseServing('4 oz', null)).toEqual({ label: '4 oz', grams: 113.4, ml: null });
    expect(parseServing('2 fl oz', null)).toEqual({ label: '2 fl oz', grams: null, ml: 59.1 });
    expect(parseServing(null, { value: 14, unit: 'g' }, 'each', 'Bacon (2 pieces)')).toEqual({
      label: '2 pieces (14 g)',
      grams: 14,
      ml: null,
    });
    expect(parseServing('Regular', { value: 600, unit: 'ml' })).toEqual({
      label: 'Regular (600 ml)',
      grams: null,
      ml: 600,
    });
    expect(parseServing('3.25oz Cup (85g)', null)).toMatchObject({ grams: 85 });
  });

  it('makes stable slugs', () => {
    expect(slug('A.1.® Sauce')).toBe('a-1-sauce');
    expect(slug('Fries & Shakes')).toBe('fries-and-shakes');
    expect(slug('Jalapeño Poppers')).toBe('jalapeno-poppers');
  });
});

describe('validation (4/4/9 within 20%)', () => {
  it('accepts close matches and absolute slack for tiny items', () => {
    expect(macroMismatch({ calories: 90, protein_g: 10, carbs_g: 1, fat_g: 5 })).toBeNull(); // 89
    expect(macroMismatch({ calories: 15, protein_g: 0, carbs_g: 4, fat_g: 0 })).toBeNull(); // 16
  });

  it('flags rows more than 20% off', () => {
    expect(macroMismatch({ calories: 302, protein_g: 16, carbs_g: 0, fat_g: 17 })).toMatch(
      /39% off/,
    );
  });

  it('holds flagged rows back as unapproved', () => {
    const items = normalizeRecords(wingstop, extractRecords(WINGSTOP_ROWS));
    const broken = { ...items[0]!, food: { ...items[0]!.food, calories: 400 }, reasons: [] };
    const { ready, flagged } = validateItems([broken, items[1]!]);
    expect(ready).toHaveLength(1);
    expect(flagged).toEqual([
      expect.objectContaining({ approved: false, reasons: [expect.stringMatching(/off 4\/4\/9/)] }),
    ]);
  });
});

it('builds columns ignoring allergen headers', () => {
  const header = FIVE_GUYS_ROWS.filter((r) => r.y >= 598 && r.y <= 607);
  const fields = buildColumns(header).map((c) => c.field);
  expect(fields).toEqual([
    'serving',
    'calories',
    'calories_from_fat',
    'fat_g',
    'sat_fat_g',
    'trans_fat_g',
    'cholesterol_mg',
    'sodium_mg',
    'carbs_g',
    'fiber_g',
    'sugar_g',
    'protein_g',
  ]);
});

describe('upload blockers', () => {
  const item = (servings: string[], food: Partial<Record<string, unknown>> = {}) =>
    ({
      food: { calories: 100, protein_g: 5, carbs_g: 10, fat_g: 4, ...food },
      servings: servings.map((label, i) => ({ label, base_multiplier: 1, is_default: i === 0 })),
    }) as unknown as Parameters<typeof uploadBlockers>[0];

  it('accepts standard units', () => {
    for (const label of [
      '1 wing (39 g)',
      '4 oz',
      '2 fl oz',
      'Regular (600 ml)',
      '1 cup',
      '2 pieces (14 g)',
      '6 pc',
      '1 Sticks (25g)',
    ]) {
      expect(isStandardPortion(label)).toBe(true);
    }
  });

  it('rejects portions with no standard unit', () => {
    expect(isStandardPortion('1 each')).toBe(false);
    expect(isStandardPortion('Regular')).toBe(false);
    expect(uploadBlockers(item(['1 each']))).toEqual([
      'No serving in a standard unit (g, oz, ml, cups, pieces).',
    ]);
    expect(uploadBlockers(item(['1 each', '100 g']))).toEqual([]);
  });

  it('requires calories, protein, carbs, and fat', () => {
    expect(uploadBlockers(item(['4 oz'], { protein_g: null, fat_g: Number.NaN }))).toEqual([
      'Missing protein_g.',
      'Missing fat_g.',
    ]);
  });
});
