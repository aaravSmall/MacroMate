/**
 * Purdue Dining (Purdue HFS menus API v2) → provider types. Pure. See docs/PURDUE_DINING.md.
 */
import type { ProviderItem, ProviderLocation, ProviderMenu, ProviderFoodRow } from './types.ts';

export const PURDUE_PROVIDER = 'purdue';
export const PURDUE_BRAND = 'Purdue Dining';

type PurdueLocationsResponse = {
  Types?: string[];
  Location?: {
    LocationId?: string;
    Name?: string;
    FormalName?: string | null;
    Type?: string | null;
  }[];
};

type PurdueAllergen = { Name?: string; Value?: boolean };

type PurdueMenuResponse = {
  Date?: string;
  IsPublished?: boolean;
  Meals?: {
    Name?: string;
    Order?: number;
    Status?: string;
    Stations?: {
      Name?: string;
      Items?: {
        ID?: string;
        Name?: string;
        NutritionReady?: boolean;
        Allergens?: PurdueAllergen[];
      }[];
    }[];
  }[];
};

type PurdueNutrient = { Name?: string; Value?: number | null; LabelValue?: string | null };

type PurdueItemResponse = {
  ID?: string;
  Name?: string;
  IsVegetarian?: boolean;
  NutritionReady?: boolean;
  Ingredients?: string | null;
  Nutrition?: PurdueNutrient[] | null;
  Allergens?: PurdueAllergen[] | null;
};

export function mapPurdueLocations(json: unknown): ProviderLocation[] {
  const body = (json ?? {}) as PurdueLocationsResponse;
  const types = body.Types ?? [];
  return (body.Location ?? [])
    .filter(
      (l): l is Required<Pick<typeof l, 'LocationId' | 'Name'>> & typeof l =>
        !!l.LocationId && !!l.Name,
    )
    .map((l) => ({
      externalId: l.LocationId,
      name: l.Name,
      formalName: l.FormalName ?? null,
      category: l.Type ?? null,
      // Dining courts first, then Quick Bites, On-the-GO!, alphabetical within each.
      sortOrder: Math.max(0, types.indexOf(l.Type ?? '')),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** "10/18/2026" → "2026-10-18". */
function isoDate(usDate: string | undefined, fallback: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(usDate ?? '');
  if (!m) return fallback;
  return `${m[3]}-${(m[1] ?? '').padStart(2, '0')}-${(m[2] ?? '').padStart(2, '0')}`;
}

/** Null when the menu isn't published. Closed meals and empty stations are dropped. */
export function mapPurdueMenu(json: unknown, requestedDate: string): ProviderMenu | null {
  const body = (json ?? {}) as PurdueMenuResponse;
  if (body.IsPublished === false) return null;
  const meals = (body.Meals ?? [])
    .map((meal, mealIndex) => ({
      name: (meal.Name ?? '').trim(),
      order: meal.Order ?? mealIndex,
      stations: (meal.Stations ?? [])
        .map((station, stationIndex) => ({
          name: (station.Name ?? '').trim(),
          order: stationIndex,
          items: (station.Items ?? [])
            .filter((item) => !!item.ID && !!item.Name)
            .map((item) => ({
              itemId: item.ID as string,
              name: (item.Name as string).trim(),
              nutritionReady: item.NutritionReady === true,
            })),
        }))
        .filter((station) => station.name && station.items.length > 0),
    }))
    .filter((meal) => meal.name && meal.stations.length > 0);
  return { date: isoDate(body.Date, requestedDate), meals };
}

/** A number from Value, else from the label ("8g", "<1g" → 0.5, "1490mg"). */
function nutrientValue(n: PurdueNutrient): number | null {
  if (typeof n.Value === 'number' && Number.isFinite(n.Value) && n.Value >= 0) {
    return Math.round(n.Value * 100) / 100;
  }
  const label = (n.LabelValue ?? '').trim();
  const less = /^<\s*(\d+(?:\.\d+)?)/.exec(label);
  if (less) return Number(less[1]) / 2;
  const m = /^(\d+(?:\.\d+)?)/.exec(label);
  return m ? Number(m[1]) : null;
}

/** "Cup" → "1 cup"; "4 oz serving" → "4 oz"; "Each" → "1 each"; "8 Cut Serving" → "1 slice (1/8)". */
export function normalizeServingLabel(label: string | null | undefined): string {
  const t = (label ?? '')
    .trim()
    .replace(/\s+serving$/i, '')
    .trim();
  if (!t) return '1 serving';
  const cut = /^(\d+)\s*cut$/i.exec(t);
  if (cut) return `1 slice (1/${cut[1]})`;
  const lower = t.toLowerCase();
  return /^[\d½¼¾]/.test(lower) ? lower : `1 ${lower}`;
}

type Target =
  | {
      column:
        | 'calories'
        | 'protein_g'
        | 'carbs_g'
        | 'fat_g'
        | 'fiber_g'
        | 'sugar_g'
        | 'sat_fat_g'
        | 'sodium_mg'
        | 'cholesterol_mg';
    }
  | { micro: string }
  | { skip: true };

const NUTRIENTS: Record<string, Target> = {
  calories: { column: 'calories' },
  'calories from fat': { skip: true },
  'total fat': { column: 'fat_g' },
  'saturated fat': { column: 'sat_fat_g' },
  'trans fat': { micro: 'trans_fat_g' },
  cholesterol: { column: 'cholesterol_mg' },
  sodium: { column: 'sodium_mg' },
  'total carbohydrate': { column: 'carbs_g' },
  'dietary fiber': { column: 'fiber_g' },
  sugar: { column: 'sugar_g' },
  sugars: { column: 'sugar_g' },
  'total sugars': { column: 'sugar_g' },
  'added sugar': { micro: 'added_sugar_g' },
  'added sugars': { micro: 'added_sugar_g' },
  protein: { column: 'protein_g' },
  calcium: { micro: 'calcium_mg' },
  iron: { micro: 'iron_mg' },
  potassium: { micro: 'potassium_mg' },
  'vitamin d': { micro: 'vitamin_d_mcg' },
  'serving size': { skip: true },
};

const DIET_TRAITS = new Set(['vegetarian', 'vegan']);

/** Null for items without nutrition (NutritionReady false, or no calories). */
export function mapPurdueItem(json: unknown): ProviderItem | null {
  const body = (json ?? {}) as PurdueItemResponse;
  if (!body.ID || !body.Name || body.NutritionReady === false || !body.Nutrition?.length)
    return null;

  const food: ProviderFoodRow = {
    source: 'dining_hall',
    provider: PURDUE_PROVIDER,
    provider_item_id: body.ID,
    external_id: `${PURDUE_PROVIDER}:${body.ID}`,
    name: body.Name.trim(),
    brand: PURDUE_BRAND,
    base_amount: 1,
    base_unit: 'serving',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: null,
    sugar_g: null,
    sat_fat_g: null,
    sodium_mg: null,
    cholesterol_mg: null,
    micros: {},
    allergens: [],
    diet_tags: [],
    ingredients: body.Ingredients?.trim() || null,
  };

  let hasCalories = false;
  let servingLabel: string | null = null;
  const unmapped: string[] = [];
  for (const n of body.Nutrition) {
    const name = (n.Name ?? '').trim().toLowerCase();
    if (name === 'serving size') servingLabel = n.LabelValue ?? null;
    const target = NUTRIENTS[name];
    const value = nutrientValue(n);
    if (!target) {
      // Unknown nutrient: keep it if its label says the unit ("12mg"), and report it.
      const unit = /(mcg|mg|g)\s*$/i.exec(n.LabelValue ?? '')?.[1]?.toLowerCase();
      if (unit && value !== null)
        food.micros[`${name.replace(/[^a-z0-9]+/g, '_')}_${unit}`] = value;
      unmapped.push(n.Name ?? '');
      continue;
    }
    if ('skip' in target || value === null) continue;
    if ('micro' in target) food.micros[target.micro] = value;
    else {
      food[target.column] = value;
      if (target.column === 'calories') hasCalories = true;
    }
  }
  if (!hasCalories) return null;

  for (const a of body.Allergens ?? []) {
    const name = (a.Name ?? '').trim().toLowerCase();
    if (!name || a.Value !== true) continue;
    (DIET_TRAITS.has(name) ? food.diet_tags : food.allergens).push(name);
  }
  if (body.IsVegetarian && !food.diet_tags.includes('vegetarian'))
    food.diet_tags.push('vegetarian');
  food.allergens.sort();
  food.diet_tags.sort();

  return {
    food,
    servings: [
      { label: normalizeServingLabel(servingLabel), base_multiplier: 1, is_default: true },
    ],
    unmapped,
  };
}
