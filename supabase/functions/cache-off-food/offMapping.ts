/**
 * Pure Open Food Facts → `foods` / `food_servings` mapping for the cache-off-food Edge Function.
 * No Deno or Supabase imports, so the app's Jest suite can test it.
 *
 * OFF nutriments are per 100 g. Sodium, cholesterol, and minerals are reported in grams; the
 * database stores milligrams.
 */

export type OffNutriments = Record<string, number | string | undefined>;

export type OffProduct = {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  serving_quantity_unit?: string;
  nutriments?: OffNutriments;
};

/** Columns of a `foods` insert row. Verification counts are omitted: a trigger owns them. */
export type OffFoodRow = {
  source: 'open_food_facts';
  visibility: 'public';
  owner_id: null;
  external_id: string;
  barcode: string;
  name: string;
  brand: string | null;
  base_amount: 100;
  base_unit: 'g';
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sat_fat_g: number | null;
  sodium_mg: number | null;
  cholesterol_mg: number | null;
  micros: Record<string, number>;
};

/** A `food_servings` insert row, minus `food_id` (known only after the food is inserted). */
export type OffServingRow = {
  label: string;
  base_multiplier: number;
  is_default: boolean;
};

/** Barcodes are 4–14 digits (EAN-8, UPC-A, EAN-13, GTIN-14, plus short in-store codes). */
export const OFF_CODE_PATTERN = /^\d{4,14}$/;

/** Only the fields the mapping uses, to keep OFF responses small. */
export const OFF_FIELDS = [
  'code',
  'product_name',
  'generic_name',
  'brands',
  'serving_size',
  'serving_quantity',
  'serving_quantity_unit',
  'nutriments',
].join(',');

/** 1 oz = 28.3495 g. The column keeps 4 decimals, so Postgres stores 0.2835. */
const OUNCE_MULTIPLIER = 0.283495;

/** Minerals stored in `micros` as `<name>_mg`. */
const MICRO_MINERALS = ['potassium', 'calcium', 'iron', 'magnesium', 'zinc'] as const;

function toNumber(value: unknown): number | undefined {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

function per100g(n: OffNutriments, name: string): number | undefined {
  return toNumber(n[`${name}_100g`]);
}

/** Grams per 100 g → milligrams, rounded to the column's two decimals. */
function mgPer100g(n: OffNutriments, name: string): number | undefined {
  const grams = per100g(n, name);
  return grams === undefined ? undefined : round2(grams * 1000);
}

/**
 * Maps an OFF product to the rows to insert. Returns null when it can't become a food: no name,
 * or no `energy-kcal_100g` (calories are required to log it).
 */
export function mapOffProductToRows(
  code: string,
  product: OffProduct,
): { food: OffFoodRow; servings: OffServingRow[] } | null {
  const n = product.nutriments ?? {};
  const calories = per100g(n, 'energy-kcal');
  const name = (product.product_name?.trim() || product.generic_name?.trim()) ?? '';
  if (calories === undefined || name === '') return null;

  const optional = (value: number | undefined) => (value === undefined ? null : round2(value));
  const micros: Record<string, number> = {};
  for (const mineral of MICRO_MINERALS) {
    const mg = mgPer100g(n, mineral);
    if (mg !== undefined) micros[`${mineral}_mg`] = mg;
  }

  const food: OffFoodRow = {
    source: 'open_food_facts',
    visibility: 'public',
    owner_id: null,
    external_id: code,
    barcode: code,
    name,
    brand: product.brands?.split(',')[0]?.trim() || null,
    base_amount: 100,
    base_unit: 'g',
    calories: round2(calories),
    protein_g: round2(per100g(n, 'proteins') ?? 0),
    carbs_g: round2(per100g(n, 'carbohydrates') ?? 0),
    fat_g: round2(per100g(n, 'fat') ?? 0),
    fiber_g: optional(per100g(n, 'fiber')),
    sugar_g: optional(per100g(n, 'sugars')),
    sat_fat_g: optional(per100g(n, 'saturated-fat')),
    sodium_mg: optional(mgPer100g(n, 'sodium')),
    cholesterol_mg: optional(mgPer100g(n, 'cholesterol')),
    micros,
  };

  // The product's own serving, only when it's measured in grams (our base unit).
  const servingGrams = toNumber(product.serving_quantity);
  const servingUnit = product.serving_quantity_unit?.trim().toLowerCase() || 'g';
  const servingLabel = product.serving_size?.trim();
  const offServing: OffServingRow | null =
    servingLabel && servingGrams !== undefined && servingGrams > 0 && servingUnit === 'g'
      ? { label: servingLabel, base_multiplier: round4(servingGrams / 100), is_default: true }
      : null;

  const servings: OffServingRow[] = [
    ...(offServing ? [offServing] : []),
    { label: '100 g', base_multiplier: 1, is_default: offServing === null },
    { label: '1 g', base_multiplier: 0.01, is_default: false },
    { label: '1 oz', base_multiplier: OUNCE_MULTIPLIER, is_default: false },
  ];

  return { food, servings };
}
