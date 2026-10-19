import fajitas from '../providers/__fixtures__/purdue-item-chicken-fajitas.json';
import hotDog from '../providers/__fixtures__/purdue-item-hot-dog.json';
import notReady from '../providers/__fixtures__/purdue-item-not-ready.json';
import locations from '../providers/__fixtures__/purdue-locations.json';
import menu from '../providers/__fixtures__/purdue-menu-earhart-2026-10-19.json';
import {
  mapPurdueItem,
  mapPurdueLocations,
  mapPurdueMenu,
  normalizeServingLabel,
} from '../providers/purdueMapping.ts';

describe('mapPurdueLocations', () => {
  it('maps locations, dining courts first', () => {
    expect(mapPurdueLocations(locations)).toEqual([
      {
        externalId: 'WILY',
        name: 'Wiley',
        formalName: expect.any(String),
        category: 'Dining Courts',
        sortOrder: 0,
      },
      {
        externalId: 'PZZA',
        name: "Pete's Za at Tarkington Hall",
        formalName: expect.any(String),
        category: 'Quick Bites',
        sortOrder: 1,
      },
      {
        externalId: 'EOTG',
        name: 'Earhart On-the-GO!',
        formalName: 'Earhart On-the-GO!',
        category: 'On-the-GO!',
        sortOrder: 2,
      },
    ]);
  });
});

describe('mapPurdueMenu', () => {
  const mapped = mapPurdueMenu(menu, '2026-10-19');

  it('maps meals → stations → items with the date as YYYY-MM-DD', () => {
    expect(mapped?.date).toBe('2026-10-19');
    expect(mapped?.meals.map((m) => [m.name, m.stations.map((s) => s.name)])).toEqual([
      ['Breakfast', ['Granite Grill', 'The Pastry Shop']],
      ['Lunch', ['Granite Grill', 'Heartland Classics']],
      ['Dinner', ['Granite Grill', 'Heartland Classics']],
    ]);
    expect(mapped?.meals[0]?.stations[0]?.items[0]).toEqual({
      itemId: expect.any(String),
      name: 'Scrambled Eggs',
      nutritionReady: true,
    });
  });

  it('keeps nutrition-less items marked so the sync can skip them', () => {
    const lunch = mapped?.meals[1]?.stations[0]?.items.find(
      (i) => i.name === 'Spicy Chicken Sandwich',
    );
    expect(lunch?.nutritionReady).toBe(false);
  });

  it('returns null for an unpublished menu and drops closed/empty meals', () => {
    expect(mapPurdueMenu({ IsPublished: false, Meals: [] }, '2026-10-19')).toBeNull();
    const closed = mapPurdueMenu(
      { IsPublished: true, Date: '10/18/2026', Meals: [{ Name: 'Breakfast', Stations: [] }] },
      'x',
    );
    expect(closed).toEqual({ date: '2026-10-18', meals: [] });
  });
});

describe('mapPurdueItem', () => {
  it('maps every nutrient from precise values, with allergens and ingredients', () => {
    const item = mapPurdueItem(fajitas);
    expect(item?.food).toEqual({
      source: 'dining_hall',
      provider: 'purdue',
      provider_item_id: 'f66e97b7-1393-42aa-a7f7-f768eff210be',
      external_id: 'purdue:f66e97b7-1393-42aa-a7f7-f768eff210be',
      name: 'Chicken Fajitas',
      brand: 'Purdue Dining',
      base_amount: 1,
      base_unit: 'serving',
      calories: 216.28,
      protein_g: 27.8,
      carbs_g: 9.19,
      fat_g: 7.62,
      fiber_g: 1.2,
      sugar_g: 1.85,
      sat_fat_g: 1.08,
      sodium_mg: 1491.35,
      cholesterol_mg: 91.72,
      micros: { added_sugar_g: 0, calcium_mg: 16.42, iron_mg: 1.67 },
      allergens: ['gluten', 'soy', 'wheat'],
      diet_tags: [],
      ingredients: expect.stringMatching(/^Chicken Fajita Strip/),
    });
    expect(item?.servings).toEqual([{ label: '1 cup', base_multiplier: 1, is_default: true }]);
    expect(item?.unmapped).toEqual([]);
  });

  it('rounds float noise and uses the serving name', () => {
    const item = mapPurdueItem(hotDog);
    expect(item?.food).toMatchObject({
      calories: 330,
      protein_g: 13,
      sat_fat_g: 13,
      sugar_g: 1,
      allergens: [],
    });
    expect(item?.servings[0]?.label).toBe('1 hot dog');
  });

  describe('allergen status', () => {
    it('stores flagged allergens when Purdue flags some', () => {
      expect(mapPurdueItem(fajitas)?.food.allergens).toEqual(['gluten', 'soy', 'wheat']);
    });

    it('stores [] when Purdue lists allergens but flags none', () => {
      // The real hot dog payload: all 13 allergen entries present, every one false.
      expect(hotDog.Allergens.length).toBe(13);
      expect(hotDog.Allergens.every((a) => !a.Value)).toBe(true);
      expect(mapPurdueItem(hotDog)?.food.allergens).toEqual([]);
    });

    it('stores null when Purdue gives no allergen data', () => {
      // The same real payload without its allergen list (missing, null, or empty).
      const { Allergens: _omit, ...withoutKey } = hotDog;
      expect(mapPurdueItem(withoutKey)?.food.allergens).toBeNull();
      expect(mapPurdueItem({ ...hotDog, Allergens: null })?.food.allergens).toBeNull();
      expect(mapPurdueItem({ ...hotDog, Allergens: [] })?.food.allergens).toBeNull();
    });

    it('counts diet traits as data but not as allergens', () => {
      const veganOnly = {
        ...hotDog,
        Allergens: hotDog.Allergens.map((a) => ({ ...a, Value: a.Name === 'Vegan' })),
      };
      expect(mapPurdueItem(veganOnly)?.food).toMatchObject({ allergens: [], diet_tags: ['vegan'] });
    });
  });

  it('returns null without nutrition', () => {
    expect(mapPurdueItem(notReady)).toBeNull();
    expect(
      mapPurdueItem({
        ID: 'x',
        Name: 'Salad Bar',
        NutritionReady: true,
        Nutrition: [{ Name: 'Serving Size', LabelValue: 'Each' }],
      }),
    ).toBeNull();
  });

  it('puts diet traits in diet_tags, falls back to labels, and keeps unknown nutrients with a unit', () => {
    const item = mapPurdueItem({
      ID: 'v1',
      Name: 'Tofu Bowl',
      NutritionReady: true,
      IsVegetarian: true,
      Nutrition: [
        { Name: 'Serving Size', LabelValue: '3/4 Cup Serving' },
        { Name: 'Calories', LabelValue: '250' },
        { Name: 'Total fat', LabelValue: '<1g' },
        { Name: 'Vitamin K', LabelValue: '40mcg' },
        { Name: 'Mystery', LabelValue: '3' },
      ],
      Allergens: [
        { Name: 'Soy', Value: true },
        { Name: 'Vegan', Value: true },
        { Name: 'Milk', Value: false },
      ],
    });
    expect(item?.food).toMatchObject({
      calories: 250,
      fat_g: 0.5,
      micros: { vitamin_k_mcg: 40 },
      allergens: ['soy'],
      diet_tags: ['vegan', 'vegetarian'],
    });
    expect(item?.servings[0]?.label).toBe('3/4 cup');
    expect(item?.unmapped).toEqual(['Vitamin K', 'Mystery']);
  });
});

describe('normalizeServingLabel', () => {
  it('turns Purdue serving names into countable labels', () => {
    expect(normalizeServingLabel('Cup')).toBe('1 cup');
    expect(normalizeServingLabel('1/2 Cup')).toBe('1/2 cup');
    expect(normalizeServingLabel('4 oz serving')).toBe('4 oz');
    expect(normalizeServingLabel('Each')).toBe('1 each');
    expect(normalizeServingLabel('Tablespoon')).toBe('1 tablespoon');
    expect(normalizeServingLabel('8 Cut Serving')).toBe('1 slice (1/8)');
    expect(normalizeServingLabel(null)).toBe('1 serving');
  });
});
