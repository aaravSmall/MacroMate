import { PORTION_GUIDES } from '@/constants/portionGuides';
import {
  applicableGuides,
  friendlyQuantity,
  quantityForGuide,
  servingLabelMeasures,
  servingMeasures,
} from '@/features/food/logic/portion';

const guide = (id: string) => {
  const g = PORTION_GUIDES.find((x) => x.id === id);
  if (!g) throw new Error(`no guide ${id}`);
  return g;
};
const per100g = { baseAmount: 100, baseUnit: 'g' as const };
const per100ml = { baseAmount: 100, baseUnit: 'ml' as const };
const perServing = { baseAmount: 1, baseUnit: 'serving' as const };

describe('servingLabelMeasures', () => {
  it('reads household and metric amounts from a label', () => {
    expect(servingLabelMeasures('2/3 cup (55 g)')).toEqual({ grams: 55, ml: 160 });
    expect(servingLabelMeasures('1 tbsp')).toEqual({ grams: null, ml: 15 });
    expect(servingLabelMeasures('4 oz')).toEqual({ grams: 113.4, ml: null });
    expect(servingLabelMeasures('8 fl oz (240 mL)').ml).toBeCloseTo(236.56, 1);
    expect(servingLabelMeasures('½ cup')).toEqual({ grams: null, ml: 120 });
    expect(servingLabelMeasures('1 bowl')).toEqual({ grams: null, ml: null });
  });
});

describe('servingMeasures', () => {
  it('uses the base for g/ml foods and the label for per-serving foods', () => {
    expect(servingMeasures(per100g, { label: '1 portion (30 g)', baseMultiplier: 0.3 })).toEqual({
      grams: 30,
      ml: null,
    });
    expect(servingMeasures(per100ml, { label: '1 can', baseMultiplier: 3.55 }).ml).toBeCloseTo(355);
    expect(servingMeasures(perServing, { label: '1 cup', baseMultiplier: 1 })).toEqual({
      grams: null,
      ml: 240,
    });
  });
});

describe('quantityForGuide', () => {
  it('converts weight references to servings of a gram-based food', () => {
    // Chicken stored per 100 g, "100 g" serving: a deck of cards (3 oz = 85 g) ≈ 0.85 → 0.9.
    expect(
      quantityForGuide(guide('deck-of-cards'), per100g, { label: '100 g', baseMultiplier: 1 }),
    ).toBe(0.9);
    // Cheese with a 1 oz (28 g) serving: two dice ≈ 1 serving.
    expect(
      quantityForGuide(guide('two-dice'), per100g, { label: '1 oz (28 g)', baseMultiplier: 0.28 }),
    ).toBe(1);
  });

  it('converts volume references using the serving label', () => {
    // Cereal "2/3 cup (55 g)": a fist (1 cup) = 1.5 servings.
    expect(
      quantityForGuide(guide('fist'), per100g, { label: '2/3 cup (55 g)', baseMultiplier: 0.55 }),
    ).toBe(1.5);
    // Peanut butter "2 tbsp (32 g)": whole thumb (1 tbsp) = 0.5.
    expect(
      quantityForGuide(guide('thumb'), per100g, { label: '2 tbsp (32 g)', baseMultiplier: 0.32 }),
    ).toBe(0.5);
  });

  it('converts for drinks stored per 100 ml', () => {
    expect(quantityForGuide(guide('fist'), per100ml, { label: '100 ml', baseMultiplier: 1 })).toBe(
      2.5,
    );
  });

  it('uses the plate guide as cups', () => {
    expect(
      quantityForGuide(guide('quarter-plate'), perServing, { label: '1 cup', baseMultiplier: 1 }),
    ).toBe(1);
    expect(
      quantityForGuide(guide('half-plate'), perServing, { label: '1 cup', baseMultiplier: 1 }),
    ).toBe(2);
    expect(
      quantityForGuide(guide('full-plate'), perServing, { label: '1/2 cup', baseMultiplier: 1 }),
    ).toBe(8);
  });

  it("returns null when it can't convert honestly", () => {
    // A cup of something only known by weight, or a weight of "1 bowl".
    expect(
      quantityForGuide(guide('fist'), per100g, { label: '100 g', baseMultiplier: 1 }),
    ).toBeNull();
    expect(
      quantityForGuide(guide('palm'), perServing, { label: '1 bowl', baseMultiplier: 1 }),
    ).toBeNull();
  });
});

describe('applicableGuides', () => {
  it('offers only references that convert for the serving', () => {
    const ids = (
      label: string,
      food: { baseAmount: number; baseUnit: 'g' | 'ml' | 'serving' } = per100g,
      mult = 1,
    ) =>
      applicableGuides(PORTION_GUIDES, food, { label, baseMultiplier: mult }).map(
        (x) => x.guide.id,
      );
    expect(ids('100 g')).toEqual(['deck-of-cards', 'palm', 'two-dice', 'cupped-hand']);
    expect(ids('1 cup', perServing)).toEqual([
      'fist',
      'half-baseball',
      'ping-pong',
      'thumb',
      'thumb-tip',
      'quarter-plate',
      'half-plate',
      'full-plate',
    ]);
    expect(ids('1 bowl', perServing)).toEqual([]);
  });
});

describe('friendlyQuantity', () => {
  it('rounds to amounts people type', () => {
    expect(friendlyQuantity(1.37)).toBe(1.25);
    expect(friendlyQuantity(2.9)).toBe(3);
    expect(friendlyQuantity(0.33)).toBe(0.3);
    expect(friendlyQuantity(0.01)).toBe(0.1);
  });
});

it('every guide cites an amount and a group', () => {
  for (const g of PORTION_GUIDES) {
    expect(g.amountText).toMatch(/^≈ /);
    expect(['weight', 'volume', 'plate']).toContain(g.group);
  }
});
