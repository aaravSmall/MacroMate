/**
 * Open Food Facts adapter. https://openfoodfacts.github.io/openfoodfacts-server/api/
 *
 * Rules we follow from their API docs:
 *   - Send a descriptive User-Agent: AppName/Version (contact).
 *   - Keep search volume modest: we only call search as a fallback, and the UI debounces.
 *   - Request only the fields we need.
 */
import Constants from 'expo-constants';

import { round1 } from '@/lib/nutrition';
import type { Food, Micronutrients, NutritionFacts, Serving } from '@/types/domain';

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
].join(',');

const APP_NAME = Constants.expoConfig?.name ?? 'Tally';
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
};

/**
 * OFF nutriment key → our micronutrient key and the factor to convert from OFF's unit.
 * OFF reports minerals and vitamins in grams; we store mg/mcg.
 */
const MICRONUTRIENT_MAP: Record<string, { key: string; factor: number }> = {
  sodium: { key: 'sodium_mg', factor: 1000 },
  cholesterol: { key: 'cholesterol_mg', factor: 1000 },
  fiber: { key: 'fiber_g', factor: 1 },
  sugars: { key: 'sugar_g', factor: 1 },
  'added-sugars': { key: 'added_sugar_g', factor: 1 },
  'saturated-fat': { key: 'saturated_fat_g', factor: 1 },
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

function calories(n: OffNutriments, basis: 'serving' | '100g'): number | undefined {
  const kcal = nutriment(n, 'energy-kcal', basis);
  if (kcal !== undefined) return kcal;
  const kj = nutriment(n, 'energy-kj', basis) ?? nutriment(n, 'energy', basis);
  return kj === undefined ? undefined : kj / KJ_PER_KCAL;
}

/**
 * Maps OFF nutriments to per-serving NutritionFacts. Uses OFF's per-serving values when the
 * product has them; otherwise falls back to per-100 g with a 100 g serving.
 * Returns null when calories are unknown, since the product isn't loggable without them.
 */
export function mapOffNutrition(
  product: OffProduct,
): { serving: Serving; nutrition: NutritionFacts } | null {
  const n = product.nutriments ?? {};
  const servingGrams = toNumber(product.serving_quantity);
  const servingUnit = product.serving_quantity_unit ?? 'g';
  const perServingKcal = calories(n, 'serving');

  const basis: 'serving' | '100g' =
    perServingKcal !== undefined && servingGrams !== undefined && servingGrams > 0
      ? 'serving'
      : '100g';
  const kcal = basis === 'serving' ? perServingKcal : calories(n, '100g');
  if (kcal === undefined) return null;

  const micronutrients: Micronutrients = {};
  for (const [offKey, { key, factor }] of Object.entries(MICRONUTRIENT_MAP)) {
    const value = nutriment(n, offKey, basis);
    if (value !== undefined) micronutrients[key] = round1(value * factor);
  }

  const serving: Serving =
    basis === 'serving' && servingGrams !== undefined
      ? {
          size: servingGrams,
          unit: servingUnit,
          grams: servingUnit === 'g' ? servingGrams : null,
        }
      : { size: 100, unit: 'g', grams: 100 };

  return {
    serving,
    nutrition: {
      calories: round1(kcal),
      proteinG: round1(nutriment(n, 'proteins', basis) ?? 0),
      carbsG: round1(nutriment(n, 'carbohydrates', basis) ?? 0),
      fatG: round1(nutriment(n, 'fat', basis) ?? 0),
      micronutrients,
    },
  };
}

/** Maps an OFF product to a Food, or null if it lacks a barcode, name, or calories. */
export function mapOffProduct(product: OffProduct): Food | null {
  const code = product.code?.trim();
  const name = (product.product_name || product.generic_name)?.trim();
  if (!code || !name) return null;
  const mapped = mapOffNutrition(product);
  if (!mapped) return null;

  const brand = product.brands?.split(',')[0]?.trim() || null;
  return {
    id: `${OFF_ID_PREFIX}${code}`,
    kind: 'food',
    name,
    brand,
    restaurant: null,
    source: 'open_food_facts',
    externalId: code,
    barcode: code,
    serving: mapped.serving,
    nutrition: mapped.nutrition,
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
