import { nutritionFromFoodRow, nutritionToFoodRow } from '@/lib/nutrition';
import type { Tables, TablesInsert } from '@/types/database';
import type { Food, FoodServing, FoodSource, NutritionFacts } from '@/types/domain';

import { baseServingLabel } from '../logic/foodRules';

/** Columns every food query selects: the food plus its servings. */
export const FOOD_SELECT = '*, food_servings(*)';

export type FoodRowWithServings = Tables<'foods'> & { food_servings: Tables<'food_servings'>[] };

export function mapServingRow(row: Tables<'food_servings'>): FoodServing {
  return {
    id: row.id,
    label: row.label,
    baseMultiplier: row.base_multiplier,
    isDefault: row.is_default,
  };
}

/** Default first, then by size. Falls back to one base amount when a food has no servings. */
function orderServings(row: FoodRowWithServings): FoodServing[] {
  const servings = row.food_servings
    .map(mapServingRow)
    .sort(
      (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.baseMultiplier - b.baseMultiplier,
    );
  if (servings.length > 0) return servings;
  return [
    {
      id: null,
      label: baseServingLabel(row.base_amount, row.base_unit),
      baseMultiplier: 1,
      isDefault: true,
    },
  ];
}

export function mapFoodRow(row: FoodRowWithServings): Food {
  return {
    id: row.id,
    ownerId: row.owner_id,
    visibility: row.visibility,
    source: row.source,
    externalId: row.external_id,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    baseAmount: row.base_amount,
    baseUnit: row.base_unit,
    nutrition: nutritionFromFoodRow(row),
    servings: orderServings(row),
    verificationCount: row.verification_count,
    mismatchCount: row.mismatch_count,
  };
}

/** A food the user creates. Clients may only create these sources (RLS enforces it). */
export type NewFoodInput = {
  source: Extract<FoodSource, 'user_product' | 'user_recipe' | 'label_scan'>;
  name: string;
  brand: string | null;
  barcode: string | null;
  baseAmount: number;
  baseUnit: Food['baseUnit'];
  /** Per base amount. */
  nutrition: NutritionFacts;
  servings: Omit<FoodServing, 'id'>[];
};

/**
 * The insert row for a new food. Never includes verification_count / mismatch_count: they're
 * maintained by a trigger and clients can't write them.
 */
export function newFoodToRow(input: NewFoodInput, ownerId: string): TablesInsert<'foods'> {
  return {
    owner_id: ownerId,
    visibility: 'private',
    source: input.source,
    name: input.name.trim(),
    brand: input.brand?.trim() || null,
    barcode: input.barcode?.trim() || null,
    base_amount: input.baseAmount,
    base_unit: input.baseUnit,
    ...nutritionToFoodRow(input.nutrition),
  };
}
