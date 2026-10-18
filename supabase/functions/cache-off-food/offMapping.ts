/**
 * Pure Open Food Facts → `foods` / `food_servings` mapping for the cache-off-food Edge Function.
 * No Deno or Supabase imports, so the app's Jest suite can test it.
 *
 * OFF's `*_100g` nutriments are per 100 g, or per 100 ml for liquids (OFF keeps the `_100g` key
 * names either way). Sodium, cholesterol, and minerals are reported in grams; the database stores
 * milligrams.
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
  /** '100g', '100ml', or 'serving'. Often '100g' even for drinks, so it isn't decisive alone. */
  nutrition_data_per?: string;
  /** Package size as printed, e.g. "330 ml", "1.5 l", "16 fl oz", "292 g". */
  quantity?: string;
  product_quantity_unit?: string;
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
  base_unit: 'g' | 'ml';
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
  'nutrition_data_per',
  'quantity',
  'product_quantity_unit',
  'nutriments',
].join(',');

/** 1 oz = 28.3495 g. The column keeps 4 decimals, so Postgres stores 0.2835. */
const OUNCE_MULTIPLIER = 0.283495;
/** 1 US fl oz = 29.57 ml. */
const FLUID_OUNCE_MULTIPLIER = 0.2957;
/** 1 cup = 240 ml (US nutrition labeling cup). */
const CUP_MULTIPLIER = 2.4;

const VOLUME_UNIT = /^(ml|cl|dl|l|fl\.? ?oz)$/i;
const VOLUME_IN_TEXT = /\d\s*(ml|cl|dl|l|fl\.? ?oz)\b/i;

/**
 * Whether OFF's nutrition is per 100 ml. `nutrition_data_per = '100ml'` decides it; otherwise a
 * serving measured in grams means solid (e.g. ice cream sold in a "16 fl oz" tub but served as
 * "141 g"), and it's liquid only when the package is a volume and any serving is in ml.
 */
export function isLiquid(product: OffProduct): boolean {
  if (product.nutrition_data_per?.trim().toLowerCase() === '100ml') return true;
  const servingUnit = product.serving_quantity_unit?.trim().toLowerCase();
  if (servingUnit === 'g') return false;
  const packageIsVolume =
    VOLUME_UNIT.test(product.product_quantity_unit?.trim() ?? '') ||
    VOLUME_IN_TEXT.test(product.quantity ?? '');
  return packageIsVolume && (servingUnit === undefined || servingUnit === 'ml');
}

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
  const baseUnit = isLiquid(product) ? 'ml' : 'g';
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
    base_unit: baseUnit,
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

  // The product's own serving, only when it's measured in the base unit (g or ml).
  const servingAmount = toNumber(product.serving_quantity);
  const servingUnit = product.serving_quantity_unit?.trim().toLowerCase() || 'g';
  const servingLabel = product.serving_size?.trim();
  const offServing: OffServingRow | null =
    servingLabel && servingAmount !== undefined && servingAmount > 0 && servingUnit === baseUnit
      ? { label: servingLabel, base_multiplier: round4(servingAmount / 100), is_default: true }
      : null;

  const standard: OffServingRow[] =
    baseUnit === 'ml'
      ? [
          { label: '100 ml', base_multiplier: 1, is_default: offServing === null },
          { label: '1 ml', base_multiplier: 0.01, is_default: false },
          { label: '1 fl oz', base_multiplier: FLUID_OUNCE_MULTIPLIER, is_default: false },
          { label: '1 cup (240 ml)', base_multiplier: CUP_MULTIPLIER, is_default: false },
        ]
      : [
          { label: '100 g', base_multiplier: 1, is_default: offServing === null },
          { label: '1 g', base_multiplier: 0.01, is_default: false },
          { label: '1 oz', base_multiplier: OUNCE_MULTIPLIER, is_default: false },
        ];
  const servings: OffServingRow[] = [...(offServing ? [offServing] : []), ...standard];

  return { food, servings };
}
