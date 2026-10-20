/**
 * Open Food Facts adapter. https://openfoodfacts.github.io/openfoodfacts-server/api/
 *
 * Rules we follow from their API docs:
 *   - Send a descriptive User-Agent: AppName/Version (contact).
 *   - Keep search volume modest: we only call search as a fallback, and the UI debounces.
 *   - Request only the fields we need.
 */
import Constants from 'expo-constants';

import { round2 } from '@/lib/nutrition';
import type { Food, FoodServing, Micronutrients, NutritionFacts } from '@/types/domain';

const BASE_URL = 'https://world.openfoodfacts.org';
const FIELDS = [
  'code',
  'product_name',
  'generic_name',
  'brands',
  'serving_size',
  'serving_quantity',
  'serving_quantity_unit',
  'nutriments',
  'allergens_tags',
].join(',');

const APP_NAME = Constants.expoConfig?.name ?? 'MacroMate';
const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
export const OFF_USER_AGENT = `${APP_NAME}/${APP_VERSION} (https://github.com/aaravSmall/MacroMate)`;

/** Prefix for ids of OFF results that aren't stored in our database. */
export const OFF_ID_PREFIX = 'off:';

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
  allergens_tags?: string[];
};

/**
 * OFF nutriment key → our micronutrient key and the factor to convert from OFF's unit.
 * OFF reports minerals and vitamins in grams; we store mg/mcg. Keys that match a `foods`
 * column (FOOD_NUTRIENT_COLUMNS) are stored there; the rest go in `micros`.
 */
const MICRONUTRIENT_MAP: Record<string, { key: string; factor: number }> = {
  sodium: { key: 'sodium_mg', factor: 1000 },
  cholesterol: { key: 'cholesterol_mg', factor: 1000 },
  fiber: { key: 'fiber_g', factor: 1 },
  sugars: { key: 'sugar_g', factor: 1 },
  'added-sugars': { key: 'added_sugar_g', factor: 1 },
  'saturated-fat': { key: 'sat_fat_g', factor: 1 },
  'trans-fat': { key: 'trans_fat_g', factor: 1 },
  potassium: { key: 'potassium_mg', factor: 1000 },
  calcium: { key: 'calcium_mg', factor: 1000 },
  iron: { key: 'iron_mg', factor: 1000 },
  magnesium: { key: 'magnesium_mg', factor: 1000 },
  zinc: { key: 'zinc_mg', factor: 1000 },
  'vitamin-d': { key: 'vitamin_d_mcg', factor: 1_000_000 },
};

const KJ_PER_KCAL = 4.184;

function toNumber(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function nutriment(n: OffNutriments, name: string, basis: 'serving' | '100g'): number | undefined {
  return toNumber(n[`${name}_${basis}`]);
}

function energyKcal(n: OffNutriments, basis: 'serving' | '100g'): number | undefined {
  const kcal = nutriment(n, 'energy-kcal', basis);
  if (kcal !== undefined) return kcal;
  const kj = nutriment(n, 'energy-kj', basis) ?? nutriment(n, 'energy', basis);
  return kj === undefined ? undefined : kj / KJ_PER_KCAL;
}

export type OffNutrition = {
  baseUnit: 'g' | 'ml';
  /** Per 100 g (or 100 ml). */
  nutrition: NutritionFacts;
  servings: FoodServing[];
};

/**
 * Maps OFF nutriments to nutrition per 100 g (or ml), the base our `foods` table uses for
 * packaged foods. When OFF only has per-serving values, they're scaled up from the serving size.
 * The product's own serving (when known) becomes the default portion, with 100 g as a second.
 * Returns null when calories are unknown, since the product isn't loggable without them.
 */
export function mapOffNutrition(product: OffProduct): OffNutrition | null {
  const n = product.nutriments ?? {};
  const quantity = toNumber(product.serving_quantity);
  const servingQuantity = quantity !== undefined && quantity > 0 ? quantity : undefined;
  const baseUnit = product.serving_quantity_unit?.toLowerCase() === 'ml' ? 'ml' : 'g';

  /** Per-100 value: OFF's own, or the per-serving value scaled to 100. */
  const per100 = (read: (basis: 'serving' | '100g') => number | undefined) => {
    const direct = read('100g');
    if (direct !== undefined) return direct;
    if (servingQuantity === undefined) return undefined;
    const perServing = read('serving');
    return perServing === undefined ? undefined : (perServing * 100) / servingQuantity;
  };

  const kcal = per100((basis) => energyKcal(n, basis));
  if (kcal === undefined) return null;

  const micronutrients: Micronutrients = {};
  for (const [offKey, { key, factor }] of Object.entries(MICRONUTRIENT_MAP)) {
    const value = per100((basis) => nutriment(n, offKey, basis));
    if (value !== undefined) micronutrients[key] = round2(value * factor);
  }

  const hundred: FoodServing = {
    id: null,
    label: `100 ${baseUnit}`,
    baseMultiplier: 1,
    isDefault: servingQuantity === undefined,
  };
  const servings: FoodServing[] =
    servingQuantity !== undefined
      ? [
          {
            id: null,
            label: product.serving_size?.trim() || `${servingQuantity} ${baseUnit}`,
            baseMultiplier: servingQuantity / 100,
            isDefault: true,
          },
          hundred,
        ]
      : [hundred];

  return {
    baseUnit,
    nutrition: {
      calories: round2(kcal),
      proteinG: round2(per100((basis) => nutriment(n, 'proteins', basis)) ?? 0),
      carbsG: round2(per100((basis) => nutriment(n, 'carbohydrates', basis)) ?? 0),
      fatG: round2(per100((basis) => nutriment(n, 'fat', basis)) ?? 0),
      micronutrients,
    },
    servings,
  };
}

/**
 * OFF `allergens_tags` ("en:milk", "en:tree-nuts") → allergen names ("milk", "tree nuts"). An
 * empty or missing list means OFF has no allergen data, not that there are none, so it's null.
 * Mirrors supabase/functions/cache-off-food/offMapping.ts.
 */
export function offAllergens(tags: readonly string[] | undefined): string[] | null {
  const names = (tags ?? [])
    .map((t) =>
      t
        .replace(/^[a-z]{2}:/, '')
        .replace(/-/g, ' ')
        .trim(),
    )
    .filter((t) => t !== '');
  return names.length > 0 ? [...new Set(names)] : null;
}

/** Maps an OFF product to a Food, or null if it lacks a barcode, name, or calories. */
export function mapOffProduct(product: OffProduct): Food | null {
  const code = product.code?.trim();
  const name = (product.product_name || product.generic_name)?.trim();
  if (!code || !name) return null;
  const mapped = mapOffNutrition(product);
  if (!mapped) return null;

  return {
    id: `${OFF_ID_PREFIX}${code}`,
    ownerId: null,
    visibility: 'public',
    source: 'open_food_facts',
    externalId: code,
    barcode: code,
    name,
    brand: product.brands?.split(',')[0]?.trim() || null,
    baseAmount: 100,
    baseUnit: mapped.baseUnit,
    nutrition: mapped.nutrition,
    servings: mapped.servings,
    verificationCount: 0,
    mismatchCount: 0,
    provider: null,
    allergens: offAllergens(product.allergens_tags),
    dietTags: [],
  };
}

async function offFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'User-Agent': OFF_USER_AGENT, Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Open Food Facts request failed (${response.status}).`);
  return (await response.json()) as T;
}

export async function searchOpenFoodFacts(
  query: string,
  { pageSize = 20, signal }: { pageSize?: number; signal?: AbortSignal } = {},
): Promise<Food[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(pageSize),
    fields: FIELDS,
  });
  const data = await offFetch<{ products?: OffProduct[] }>(`/cgi/search.pl?${params}`, signal);
  return (data.products ?? []).map(mapOffProduct).filter((food): food is Food => food !== null);
}

export async function getOpenFoodFactsProduct(
  barcode: string,
  signal?: AbortSignal,
): Promise<Food | null> {
  const data = await offFetch<{ status?: number; product?: OffProduct }>(
    `/api/v2/product/${encodeURIComponent(barcode)}?fields=${FIELDS}`,
    signal,
  );
  return data.status === 1 && data.product ? mapOffProduct(data.product) : null;
}
