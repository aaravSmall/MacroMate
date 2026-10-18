import {
  buildLogEntry,
  buildLogInsert,
  type NewLogInput,
  portionNutrition,
  rescaleTotals,
} from '@/features/logging/logic/snapshot';
import type { Food } from '@/types/domain';

/** Per 100 g, with a 170 g cup as the default serving. */
const food: Food = {
  id: 'food-1',
  ownerId: 'someone-else',
  visibility: 'public',
  source: 'user_product',
  externalId: null,
  barcode: null,
  name: 'Greek yogurt, plain, nonfat',
  brand: 'Acme',
  baseAmount: 100,
  baseUnit: 'g',
  nutrition: {
    calories: 59,
    proteinG: 10,
    carbsG: 3.6,
    fatG: 0.4,
    micronutrients: { sodium_mg: 36 },
  },
  servings: [
    { id: 'serving-cup', label: '1 cup (170 g)', baseMultiplier: 1.7, isDefault: true },
    { id: null, label: '100 g', baseMultiplier: 1, isDefault: false },
  ],
  verificationCount: 0,
  mismatchCount: 0,
  provider: null,
  allergens: [],
  dietTags: [],
};

const [cup] = food.servings;
if (!cup) throw new Error('fixture needs a serving');

const input: NewLogInput = {
  food,
  serving: cup,
  quantity: 1.5,
  loggedAt: new Date('2026-10-16T13:12:00.000Z'),
  localDate: '2026-10-16',
  meal: 'breakfast',
};

describe('portionNutrition', () => {
  it('is food value × serving multiplier × quantity', () => {
    expect(portionNutrition(food, cup, 1.5)).toEqual({
      calories: 150.5, // 59 × 1.7 × 1.5
      proteinG: 25.5,
      carbsG: 9.2,
      fatG: 1,
      micronutrients: { sodium_mg: 91.8 },
    });
  });
});

describe('buildLogInsert', () => {
  it('snapshots the name and computed nutrition', () => {
    expect(buildLogInsert(input, 'user-1')).toEqual({
      user_id: 'user-1',
      food_id: 'food-1',
      serving_id: 'serving-cup',
      quantity: 1.5,
      logged_at: '2026-10-16T13:12:00.000Z',
      local_date: '2026-10-16',
      meal: 'breakfast',
      food_name: 'Greek yogurt, plain, nonfat (Acme)',
      calories: 150.5,
      protein_g: 25.5,
      carbs_g: 9.2,
      fat_g: 1,
      nutrients: { sodium_mg: 91.8 },
    });
  });

  it('refuses an uncached Open Food Facts result (cache it first)', () => {
    const off: Food = { ...food, id: 'off:0123', brand: null };
    expect(() => buildLogInsert({ ...input, food: off }, 'user-1')).toThrow(/Cache/);
  });

  it('keeps a null serving id for a fallback portion', () => {
    const hundred = food.servings[1];
    if (!hundred) throw new Error('fixture needs two servings');
    expect(buildLogInsert({ ...input, serving: hundred }, 'u').serving_id).toBeNull();
  });
});

describe('buildLogEntry', () => {
  it('matches the insert, for optimistic updates', () => {
    expect(buildLogEntry(input, 'optimistic-1')).toEqual({
      id: 'optimistic-1',
      loggedAt: '2026-10-16T13:12:00.000Z',
      localDate: '2026-10-16',
      meal: 'breakfast',
      foodId: 'food-1',
      servingId: 'serving-cup',
      quantity: 1.5,
      foodName: 'Greek yogurt, plain, nonfat (Acme)',
      totals: portionNutrition(food, cup, 1.5),
    });
  });
});

describe('rescaleTotals', () => {
  it('scales a snapshot to a new quantity', () => {
    const totals = portionNutrition(food, cup, 1);
    expect(rescaleTotals(totals, 1, 2).calories).toBe(200.6);
  });
});

describe('editing a meal after logging it', () => {
  it('never changes entries already logged: they keep their own snapshot', () => {
    const meal: Food = {
      ...food,
      id: 'meal-1',
      source: 'user_recipe',
      ownerId: 'user-1',
      visibility: 'private',
      baseAmount: 1,
      baseUnit: 'serving',
      nutrition: { calories: 500, proteinG: 30, carbsG: 50, fatG: 20, micronutrients: {} },
      servings: [{ id: 'serving-1', label: '1 bowl', baseMultiplier: 1, isDefault: true }],
    };
    const [bowl] = meal.servings;
    if (!bowl) throw new Error('fixture needs a serving');
    const logged = buildLogInsert({ ...input, food: meal, serving: bowl, quantity: 1 }, 'user-1');
    const snapshot = { ...logged };

    // The recipe is edited: new nutrition on the same food id.
    const edited: Food = { ...meal, nutrition: { ...meal.nutrition, calories: 650, fatG: 35 } };

    // The stored row is a value, not a reference to the food: nothing about it changes...
    expect(logged).toEqual(snapshot);
    expect(logged.calories).toBe(500);
    // ...while new logs use the edited values.
    expect(
      buildLogInsert({ ...input, food: edited, serving: bowl, quantity: 1 }, 'user-1').calories,
    ).toBe(650);
    // Changing an old entry's amount rescales its own snapshot, not the edited recipe.
    expect(rescaleTotals(portionNutrition(meal, bowl, 1), 1, 2).calories).toBe(1000);
  });
});
