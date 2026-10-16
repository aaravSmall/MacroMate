import { nutritionFromRow, nutritionToRow } from '@/lib/nutrition';
import type { Tables, TablesInsert } from '@/types/database';
import type { Food, UserFood } from '@/types/domain';

export function mapFoodRow(row: Tables<'foods'>): Food {
  return {
    id: row.id,
    kind: 'food',
    name: row.name,
    brand: row.brand,
    restaurant: row.restaurant,
    source: row.source,
    externalId: row.external_id,
    barcode: row.barcode,
    serving: { size: row.serving_size, unit: row.serving_unit, grams: row.serving_grams },
    nutrition: nutritionFromRow(row),
  };
}

export function mapUserFoodRow(row: Tables<'user_foods'>): UserFood {
  return {
    id: row.id,
    kind: 'userFood',
    name: row.name,
    brand: row.brand,
    restaurant: row.restaurant,
    barcode: row.barcode,
    serving: { size: row.serving_size, unit: row.serving_unit, grams: row.serving_grams },
    nutrition: nutritionFromRow(row),
    isShared: row.is_shared,
    sharedFoodId: row.shared_food_id,
  };
}

export type UserFoodInput = Pick<
  UserFood,
  'name' | 'brand' | 'restaurant' | 'barcode' | 'serving' | 'nutrition'
>;

export function userFoodInputToRow(
  input: UserFoodInput,
): Omit<TablesInsert<'user_foods'>, 'user_id'> {
  return {
    name: input.name.trim(),
    brand: input.brand?.trim() || null,
    restaurant: input.restaurant?.trim() || null,
    barcode: input.barcode?.trim() || null,
    serving_size: input.serving.size,
    serving_unit: input.serving.unit,
    serving_grams: input.serving.grams,
    ...nutritionToRow(input.nutrition),
  };
}
