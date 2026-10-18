import {
  FOOD_SELECT,
  type FoodRowWithServings,
  mapFoodRow,
} from '@/features/food/services/mappers';
import { supabase } from '@/lib/supabase';

import { groupMenu } from '../logic/menu';
import type { DiningLocation, DiningMeal } from '../types';

export async function listDiningLocations(): Promise<DiningLocation[]> {
  const { data, error } = await supabase
    .from('dining_locations')
    .select('id, provider, name, category, sort_order')
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return data.map((r) => ({ id: r.id, provider: r.provider, name: r.name, category: r.category }));
}

/** What a location serves on a date (`YYYY-MM-DD`), grouped by meal and station. */
export async function getDiningMenu(locationId: string, date: string): Promise<DiningMeal[]> {
  const { data, error } = await supabase
    .from('dining_menu_items')
    .select(`meal, station, meal_order, sort_order, food:foods(${FOOD_SELECT})`)
    .eq('location_id', locationId)
    .eq('served_on', date)
    .order('meal_order')
    .order('sort_order');
  if (error) throw error;
  return groupMenu(
    data.flatMap((r) =>
      r.food
        ? [
            {
              meal: r.meal,
              station: r.station,
              mealOrder: r.meal_order,
              sortOrder: r.sort_order,
              food: mapFoodRow(r.food as unknown as FoodRowWithServings),
            },
          ]
        : [],
    ),
  );
}
