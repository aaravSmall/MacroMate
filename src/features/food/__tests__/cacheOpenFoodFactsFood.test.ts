import { CacheFoodError, cacheOpenFoodFactsFood } from '@/features/food/services/foodService';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
  requireUserId: jest.fn(),
}));

const invoke = supabase.functions.invoke as unknown as jest.Mock;

const row = {
  id: 'food-1',
  owner_id: null,
  visibility: 'public',
  source: 'open_food_facts',
  external_id: '3017620422003',
  barcode: '3017620422003',
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
  sodium_mg: 42.8,
  cholesterol_mg: null,
  micros: {},
  verification_count: 0,
  mismatch_count: 0,
  search_vector: null,
  created_at: '2026-10-18T12:00:00Z',
  food_servings: [
    {
      id: 's-1g',
      food_id: 'food-1',
      label: '1 g',
      base_multiplier: 0.01,
      is_default: false,
      created_at: '',
    },
    {
      id: 's-100',
      food_id: 'food-1',
      label: '100 g',
      base_multiplier: 1,
      is_default: true,
      created_at: '',
    },
  ],
};

beforeEach(() => invoke.mockReset());

describe('cacheOpenFoodFactsFood', () => {
  it('sends only the barcode and maps the returned food', async () => {
    invoke.mockResolvedValue({ data: { food: row, created: true }, error: null });
    const food = await cacheOpenFoodFactsFood('3017620422003');
    expect(invoke).toHaveBeenCalledWith('cache-off-food', { body: { code: '3017620422003' } });
    expect(food).toMatchObject({
      id: 'food-1',
      ownerId: null,
      visibility: 'public',
      source: 'open_food_facts',
      externalId: '3017620422003',
      nutrition: { calories: 539, micronutrients: { sodium_mg: 42.8, sat_fat_g: 10.6 } },
    });
    expect(food.servings[0]).toMatchObject({ id: 's-100', isDefault: true });
  });

  it('turns a 404 into a friendly error', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: new Response('', { status: 404 }) } });
    const result = cacheOpenFoodFactsFood('3017620422003');
    await expect(result).rejects.toBeInstanceOf(CacheFoodError);
    await expect(result).rejects.toThrow("We couldn't find nutrition info for this product.");
  });

  it('uses a generic message for other failures', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('Failed to send a request') });
    await expect(cacheOpenFoodFactsFood('3017620422003')).rejects.toThrow(/try again/);
  });
});
