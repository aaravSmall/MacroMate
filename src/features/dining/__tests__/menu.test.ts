import {
  defaultMealIndex,
  groupMenu,
  mealTypeFor,
  type MenuRow,
} from '@/features/dining/logic/menu';
import type { Food } from '@/types/domain';

const food = (id: string): Food => ({
  id,
  ownerId: null,
  visibility: 'public',
  source: 'dining_hall',
  externalId: `purdue:${id}`,
  barcode: null,
  name: id,
  brand: 'Purdue Dining',
  baseAmount: 1,
  baseUnit: 'serving',
  nutrition: { calories: 100, proteinG: 1, carbsG: 1, fatG: 1, micronutrients: {} },
  servings: [{ id: `s-${id}`, label: '1 cup', baseMultiplier: 1, isDefault: true }],
  verificationCount: 0,
  mismatchCount: 0,
  provider: 'purdue',
  allergens: [],
  dietTags: [],
});

const row = (
  meal: string,
  mealOrder: number,
  station: string,
  sortOrder: number,
  id: string,
): MenuRow => ({
  meal,
  station,
  mealOrder,
  sortOrder,
  food: food(id),
});

describe('groupMenu', () => {
  it("groups by meal then station in the provider's order", () => {
    const meals = groupMenu([
      row('Dinner', 2, 'Grill', 0, 'burger'),
      row('Breakfast', 0, 'Grill', 1, 'bacon'),
      row('Breakfast', 0, 'Bakery', 2, 'muffin'),
      row('Breakfast', 0, 'Grill', 0, 'eggs'),
      row('Dinner', 2, 'Grill', 0, 'burger'), // repeat
    ]);
    expect(
      meals.map((m) => [m.name, m.stations.map((s) => [s.name, s.foods.map((f) => f.id)])]),
    ).toEqual([
      [
        'Breakfast',
        [
          ['Grill', ['eggs', 'bacon']],
          ['Bakery', ['muffin']],
        ],
      ],
      ['Dinner', [['Grill', ['burger']]]],
    ]);
  });
});

describe('mealTypeFor / defaultMealIndex', () => {
  it('maps dining meal names to log meals', () => {
    expect(mealTypeFor('Breakfast')).toBe('breakfast');
    expect(mealTypeFor('Breakfast/Lunch')).toBe('breakfast');
    expect(mealTypeFor('Late Lunch')).toBe('lunch');
    expect(mealTypeFor('Lunch/Dinner')).toBe('lunch');
    expect(mealTypeFor('Dinner')).toBe('dinner');
    expect(mealTypeFor('Late Night')).toBe('snack');
  });

  it('opens the meal for the time of day, else the first', () => {
    const meals = [{ name: 'Breakfast' }, { name: 'Lunch' }, { name: 'Dinner' }];
    expect(defaultMealIndex(meals, 'dinner')).toBe(2);
    expect(defaultMealIndex([{ name: 'Lunch/Dinner' }], 'dinner')).toBe(0);
    expect(defaultMealIndex([], 'lunch')).toBe(0);
  });
});
