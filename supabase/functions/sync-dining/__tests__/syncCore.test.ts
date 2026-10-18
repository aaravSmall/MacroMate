import fajitas from '../providers/__fixtures__/purdue-item-chicken-fajitas.json';
import hotDog from '../providers/__fixtures__/purdue-item-hot-dog.json';
import locationsJson from '../providers/__fixtures__/purdue-locations.json';
import menuJson from '../providers/__fixtures__/purdue-menu-earhart-2026-10-19.json';
import { localDates, type MenuRow, runSync, type SyncStore } from '../lib/syncCore.ts';
import { mapPurdueItem, mapPurdueLocations, mapPurdueMenu } from '../providers/purdueMapping.ts';
import type { DiningProvider, ProviderFoodRow, ProviderServingRow } from '../providers/types.ts';

/** Provider backed by the fixtures: every location serves the Earhart menu every day. */
function fixtureProvider(
  overrides: Partial<{ menu: unknown; item: (id: string) => unknown }> = {},
): DiningProvider & { itemCalls: string[] } {
  const itemCalls: string[] = [];
  return {
    id: 'purdue',
    timeZone: 'America/Indiana/Indianapolis',
    itemCalls,
    async listLocations() {
      return mapPurdueLocations(locationsJson).slice(0, 2);
    },
    async getMenu(_location, date) {
      return mapPurdueMenu(overrides.menu ?? menuJson, date);
    },
    async getItem(itemId) {
      itemCalls.push(itemId);
      // Alternate between two real item payloads, re-identified per item id.
      const base = overrides.item
        ? overrides.item(itemId)
        : itemId.charCodeAt(0) % 2
          ? fajitas
          : hotDog;
      const mapped = mapPurdueItem({
        ...(base as object),
        ID: itemId,
        Name: `Item ${itemId.slice(0, 6)}`,
      });
      return mapped;
    },
  };
}

/** In-memory SyncStore that mirrors the real one's semantics. */
function memoryStore() {
  const locations = new Map<string, string>();
  const foods = new Map<
    string,
    { id: string; food: ProviderFoodRow; servings: ProviderServingRow[]; syncedAt: string }
  >();
  const menu = new Map<string, MenuRow & { locationId: string; date: string }>();
  const store: SyncStore = {
    async upsertLocations(provider, locs) {
      for (const l of locs)
        if (!locations.has(l.externalId)) locations.set(l.externalId, `loc-${l.externalId}`);
      return new Map(locs.map((l) => [l.externalId, locations.get(l.externalId) as string]));
    },
    async findFoods(_provider, ids) {
      return new Map(
        ids
          .filter((id) => foods.has(id))
          .map((id) => [id, { id: foods.get(id)!.id, syncedAt: foods.get(id)!.syncedAt }]),
      );
    },
    async upsertFood(food, servings) {
      const prev = foods.get(food.provider_item_id);
      const id = prev?.id ?? `food-${food.provider_item_id}`;
      const changed = !!prev && JSON.stringify(prev.food) !== JSON.stringify(food);
      foods.set(food.provider_item_id, { id, food, servings, syncedAt: new Date().toISOString() });
      return { id, changed };
    },
    async syncMenu(locationId, date, rows, mode) {
      const k = (r: { meal: string; station: string; foodId: string }) =>
        `${locationId}|${date}|${r.meal}|${r.station}|${r.foodId}`;
      const current = new Set(
        [...menu.keys()].filter((key) => key.startsWith(`${locationId}|${date}|`)),
      );
      const diff = { inserted: 0, deleted: 0, reordered: 0, unchanged: 0 };
      for (const row of rows) {
        const key = k(row);
        const found = menu.get(key);
        if (!found) diff.inserted += 1;
        else if (found.sortOrder !== row.sortOrder || found.mealOrder !== row.mealOrder)
          diff.reordered += 1;
        else diff.unchanged += 1;
        menu.set(key, { ...row, locationId, date });
        current.delete(key);
      }
      if (mode === 'replace')
        for (const key of current) {
          menu.delete(key);
          diff.deleted += 1;
        }
      return diff;
    },
  };
  return { store, foods, menu };
}

const now = new Date('2026-10-19T10:00:00Z'); // 6 am in West Lafayette

describe('localDates', () => {
  it("is today and the next days in the provider's time zone", () => {
    expect(localDates(new Date('2026-10-19T03:00:00Z'), 'America/Indiana/Indianapolis', 3)).toEqual(
      ['2026-10-18', '2026-10-19', '2026-10-20'],
    );
  });
});

describe('runSync', () => {
  it('creates locations, foods, and menu rows, skipping items without nutrition', async () => {
    const { store, foods, menu } = memoryStore();
    const provider = fixtureProvider();
    const result = await runSync({ provider, store, now });
    // The fixture menu lists 16 items: 13 with nutrition, of which 11 are unique (two repeat at
    // lunch and dinner). 2 locations × 3 days = 6 menus.
    expect(result).toMatchObject({
      locations: 2,
      menus: 6,
      menuItemsSeen: 11,
      itemsFetched: 11,
      foodsInserted: 11,
      complete: true,
      errors: [],
    });
    expect(foods.size).toBe(11);
    expect(menu.size).toBe(result.menuRows.inserted);
    expect(result.menuRows.inserted).toBe(6 * 13);
    expect([...menu.values()].every((r) => foods.has(r.foodId.replace('food-', '')))).toBe(true);
  });

  it('is idempotent: a second run fetches nothing and changes nothing', async () => {
    const { store, foods, menu } = memoryStore();
    const provider = fixtureProvider();
    await runSync({ provider, store, now });
    const before =
      JSON.stringify([...foods.values()].map((f) => f.food)) + JSON.stringify([...menu.entries()]);
    provider.itemCalls.length = 0;

    const second = await runSync({ provider, store, now });
    expect(second).toMatchObject({
      itemsFetched: 0,
      foodsInserted: 0,
      foodsChanged: 0,
      complete: true,
    });
    expect(second.menuRows).toEqual({ inserted: 0, deleted: 0, reordered: 0, unchanged: 6 * 13 });
    expect(provider.itemCalls).toEqual([]);
    expect(
      JSON.stringify([...foods.values()].map((f) => f.food)) + JSON.stringify([...menu.entries()]),
    ).toBe(before);
  });

  it('removes menu rows for dishes taken off the menu, but never the foods', async () => {
    const { store, foods, menu } = memoryStore();
    await runSync({ provider: fixtureProvider(), store, now });
    const foodCount = foods.size;

    const trimmed = JSON.parse(JSON.stringify(menuJson));
    trimmed.Meals = trimmed.Meals.slice(0, 1); // only breakfast now
    const result = await runSync({ provider: fixtureProvider({ menu: trimmed }), store, now });
    expect(result.menuRows.deleted).toBeGreaterThan(0);
    expect(foods.size).toBe(foodCount);
    expect([...menu.values()].every((r) => r.meal === 'Breakfast')).toBe(true);
  });

  it('stops fetching at the deadline and merges (no deletions) until complete', async () => {
    const { store } = memoryStore();
    let t = 0;
    const provider = fixtureProvider();
    const partial = await runSync({ provider, store, now, deadline: 5, clock: () => t++ });
    expect(partial.complete).toBe(false);
    expect(partial.itemsFetched).toBeLessThan(11);
    expect(partial.menuRows.deleted).toBe(0);

    const finish = await runSync({ provider, store, now });
    expect(finish.complete).toBe(true);
    expect(finish.foodsInserted).toBe(11 - partial.foodsInserted);
  });

  it('refreshes stale items and reports nutrition changes', async () => {
    const { store, foods } = memoryStore();
    await runSync({ provider: fixtureProvider(), store, now });
    for (const f of foods.values()) f.syncedAt = '2026-01-01T00:00:00Z';
    const changedProvider = fixtureProvider({
      item: () => ({
        ...hotDog,
        Nutrition: hotDog.Nutrition.map((n) => (n.Name === 'Calories' ? { ...n, Value: 345 } : n)),
      }),
    });
    const result = await runSync({ provider: changedProvider, store, now });
    expect(result.itemsFetched).toBe(11);
    expect(result.foodsChanged + result.foodsUnchanged).toBe(11);
    expect([...foods.values()].every((f) => f.food.calories === 345)).toBe(true);
  });
});
