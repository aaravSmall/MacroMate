/**
 * Dining provider contract. A provider turns a campus dining API into locations, daily menus
 * (meals → stations → items), and item details mapped to our `foods` schema. Pure types; no
 * Deno or npm imports.
 */

export type ProviderLocation = {
  externalId: string;
  name: string;
  formalName: string | null;
  category: string | null;
  sortOrder: number;
};

export type ProviderMenuItem = { itemId: string; name: string; nutritionReady: boolean };

export type ProviderMenu = {
  /** YYYY-MM-DD in the provider's time zone. */
  date: string;
  meals: {
    name: string;
    order: number;
    stations: { name: string; order: number; items: ProviderMenuItem[] }[];
  }[];
};

/** A `foods` row for upsert_provider_food (source 'dining_hall', public, no owner). */
export type ProviderFoodRow = {
  source: 'dining_hall';
  provider: string;
  provider_item_id: string;
  external_id: string;
  name: string;
  brand: string;
  base_amount: 1;
  base_unit: 'serving';
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
  allergens: string[];
  diet_tags: string[];
  ingredients: string | null;
};

export type ProviderServingRow = { label: string; base_multiplier: number; is_default: boolean };

export type ProviderItem = {
  food: ProviderFoodRow;
  servings: ProviderServingRow[];
  /** Nutrient names the mapping didn't recognize (logged so the mapping can be extended). */
  unmapped: string[];
};

export interface DiningProvider {
  /** Stable id stored in foods.provider and dining_locations.provider. */
  readonly id: string;
  /** IANA time zone the provider's menus use ("today" is computed there). */
  readonly timeZone: string;
  listLocations(): Promise<ProviderLocation[]>;
  /** Null when the location has no published menu that day. */
  getMenu(location: ProviderLocation, date: string): Promise<ProviderMenu | null>;
  /** Null when the item has no nutrition (e.g. "Salad Bar"). */
  getItem(itemId: string): Promise<ProviderItem | null>;
}
