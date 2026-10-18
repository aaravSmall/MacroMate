/**
 * The dining sync, independent of Supabase and of any one provider (both injected), so it's
 * unit-tested with an in-memory store.
 *
 * 1. Upsert the provider's locations.
 * 2. Fetch each location's menu for today + the next days (provider time zone).
 * 3. Fetch item details only for items we don't have yet, or haven't refreshed in a while, until
 *    the time budget runs out (first runs are large; daily runs are small). Upsert those foods.
 * 4. For each location/date, make the stored menu rows match: insert new rows, delete rows no
 *    longer on the menu, fix ordering. Foods are never deleted, so past logs keep their food.
 *    If some items couldn't be fetched in time, that menu is merged (no deletions) and the next
 *    run finishes it.
 *
 * Running it twice changes nothing the second time.
 */
import type {
  DiningProvider,
  ProviderFoodRow,
  ProviderLocation,
  ProviderServingRow,
} from '../providers/types.ts';

export type MenuRow = {
  meal: string;
  station: string;
  foodId: string;
  mealOrder: number;
  sortOrder: number;
};

export type MenuDiff = { inserted: number; deleted: number; reordered: number; unchanged: number };

export interface SyncStore {
  /** Upsert by (provider, external_id); returns external_id → location id. */
  upsertLocations(provider: string, locations: ProviderLocation[]): Promise<Map<string, string>>;
  /** Stored foods for these provider item ids: provider_item_id → { id, syncedAt }. */
  findFoods(
    provider: string,
    itemIds: string[],
  ): Promise<Map<string, { id: string; syncedAt: string | null }>>;
  /** upsert_provider_food; returns the food id and whether stored nutrition changed. */
  upsertFood(
    food: ProviderFoodRow,
    servings: ProviderServingRow[],
  ): Promise<{ id: string; changed: boolean }>;
  /** Makes the stored rows for one location/date match `rows` (or only adds, when merge). */
  syncMenu(
    locationId: string,
    date: string,
    rows: MenuRow[],
    mode: 'replace' | 'merge',
  ): Promise<MenuDiff>;
}

export type SyncResult = {
  provider: string;
  dates: string[];
  locations: number;
  menus: number;
  menusSkipped: number;
  menuItemsSeen: number;
  itemsFetched: number;
  foodsInserted: number;
  foodsChanged: number;
  foodsUnchanged: number;
  itemsWithoutNutrition: number;
  menuRows: MenuDiff;
  /** False when the time budget ran out; the next run continues. */
  complete: boolean;
  unmappedNutrients: string[];
  errors: string[];
};

/** YYYY-MM-DD for `now` and the following days, in `timeZone`. */
export function localDates(now: Date, timeZone: string, days: number): string[] {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() + i * 86_400_000);
    out.push(fmt.format(d));
  }
  return [...new Set(out)];
}

export async function runSync({
  provider,
  store,
  now = new Date(),
  days = 3,
  deadline = Number.POSITIVE_INFINITY,
  refreshAfterDays = 7,
  clock = () => Date.now(),
}: {
  provider: DiningProvider;
  store: SyncStore;
  now?: Date;
  days?: number;
  /** Epoch ms after which no more item details are fetched. */
  deadline?: number;
  refreshAfterDays?: number;
  clock?: () => number;
}): Promise<SyncResult> {
  const dates = localDates(now, provider.timeZone, days);
  const result: SyncResult = {
    provider: provider.id,
    dates,
    locations: 0,
    menus: 0,
    menusSkipped: 0,
    menuItemsSeen: 0,
    itemsFetched: 0,
    foodsInserted: 0,
    foodsChanged: 0,
    foodsUnchanged: 0,
    itemsWithoutNutrition: 0,
    menuRows: { inserted: 0, deleted: 0, reordered: 0, unchanged: 0 },
    complete: true,
    unmappedNutrients: [],
    errors: [],
  };

  const locations = await provider.listLocations();
  const locationIds = await store.upsertLocations(provider.id, locations);
  result.locations = locations.length;

  // Menus (one request at a time; the provider throttles).
  const menus: {
    locationId: string;
    date: string;
    menu: NonNullable<Awaited<ReturnType<DiningProvider['getMenu']>>>;
  }[] = [];
  for (const location of locations) {
    const locationId = locationIds.get(location.externalId);
    if (!locationId) continue;
    for (const date of dates) {
      try {
        const menu = await provider.getMenu(location, date);
        if (!menu) {
          result.menusSkipped += 1;
          continue;
        }
        menus.push({ locationId, date, menu });
      } catch (error) {
        result.errors.push(
          `menu ${location.name} ${date}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
  result.menus = menus.length;

  // Items: only new or stale ones need a detail request.
  const itemIds = [
    ...new Set(
      menus.flatMap((m) =>
        m.menu.meals.flatMap((meal) =>
          meal.stations.flatMap((s) =>
            s.items.filter((i) => i.nutritionReady).map((i) => i.itemId),
          ),
        ),
      ),
    ),
  ];
  result.menuItemsSeen = itemIds.length;
  const known = await store.findFoods(provider.id, itemIds);
  const foodIds = new Map<string, string>([...known].map(([itemId, f]) => [itemId, f.id]));
  const staleBefore = now.getTime() - refreshAfterDays * 86_400_000;
  const needed = itemIds
    .filter((id) => {
      const f = known.get(id);
      return !f || !f.syncedAt || new Date(f.syncedAt).getTime() < staleBefore;
    })
    // New items before refreshes, so a short budget still fills menus first.
    .sort((a, b) => Number(known.has(a)) - Number(known.has(b)));

  const unmapped = new Set<string>();
  for (const itemId of needed) {
    if (clock() >= deadline) {
      result.complete = false;
      break;
    }
    try {
      const item = await provider.getItem(itemId);
      result.itemsFetched += 1;
      if (!item) {
        result.itemsWithoutNutrition += 1;
        continue;
      }
      item.unmapped.forEach((n) => unmapped.add(n));
      const wasKnown = known.has(itemId);
      const { id, changed } = await store.upsertFood(item.food, item.servings);
      foodIds.set(itemId, id);
      if (!wasKnown) result.foodsInserted += 1;
      else if (changed) result.foodsChanged += 1;
      else result.foodsUnchanged += 1;
    } catch (error) {
      result.errors.push(
        `item ${itemId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  result.unmappedNutrients = [...unmapped].sort();

  // Menu rows.
  for (const { locationId, date, menu } of menus) {
    const rows: MenuRow[] = [];
    let missing = 0;
    for (const meal of menu.meals) {
      let sort = 0;
      for (const station of meal.stations) {
        for (const item of station.items) {
          const foodId = foodIds.get(item.itemId);
          if (!foodId) {
            // No nutrition (never stored) or not fetched yet.
            if (item.nutritionReady) missing += 1;
            continue;
          }
          rows.push({
            meal: meal.name,
            station: station.name,
            foodId,
            mealOrder: meal.order,
            sortOrder: sort++,
          });
        }
      }
    }
    // The same food twice at one station/meal collapses to one row (the unique key).
    const unique = [
      ...new Map(rows.map((r) => [`${r.meal}|${r.station}|${r.foodId}`, r])).values(),
    ];
    const diff = await store.syncMenu(locationId, date, unique, missing > 0 ? 'merge' : 'replace');
    result.menuRows.inserted += diff.inserted;
    result.menuRows.deleted += diff.deleted;
    result.menuRows.reordered += diff.reordered;
    result.menuRows.unchanged += diff.unchanged;
  }

  return result;
}
