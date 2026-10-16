import { buildLogEntry } from '@/features/logging/logic/snapshot';
import type { Food, UserFood } from '@/types/domain';

const food: Food = {
  id: 'food-1',
  kind: 'food',
  name: 'Greek yogurt, plain, nonfat',
  brand: 'Acme',
  restaurant: null,
  source: 'manual',
  externalId: null,
  barcode: null,
  serving: { size: 170, unit: 'g', grams: 170 },
  nutrition: { calories: 100, proteinG: 17, carbsG: 6, fatG: 0, micronutrients: { sodium_mg: 60 } },
};

describe('buildLogEntry', () => {
  it('snapshots the food and scales totals by servings', () => {
    const loggedAt = new Date('2026-10-16T08:12:00.000Z');
    const entry = buildLogEntry({ food, servings: 1.5, loggedAt, mealLabel: 'breakfast' }, 'id-1');
    expect(entry).toMatchObject({
      id: 'id-1',
      loggedAt: '2026-10-16T08:12:00.000Z',
      mealLabel: 'breakfast',
      source: { kind: 'food', foodId: 'food-1' },
      servings: 1.5,
      foodName: 'Greek yogurt, plain, nonfat',
      foodBrand: 'Acme',
      serving: { size: 170, unit: 'g' },
      nutritionPerServing: food.nutrition,
      totals: {
        calories: 150,
        proteinG: 25.5,
        carbsG: 9,
        fatG: 0,
        micronutrients: { sodium_mg: 90 },
      },
    });
  });

  it('references a user food by userFoodId', () => {
    const userFood: UserFood = {
      ...food,
      id: 'uf-1',
      kind: 'userFood',
      isShared: false,
      sharedFoodId: null,
    };
    const entry = buildLogEntry(
      { food: userFood, servings: 1, loggedAt: new Date(), mealLabel: 'snack' },
      'id-2',
    );
    expect(entry.source).toEqual({ kind: 'userFood', userFoodId: 'uf-1' });
  });
});
