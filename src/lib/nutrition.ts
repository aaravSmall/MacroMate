import type { Json } from '@/types/database';
import type { Micronutrients, NutritionFacts } from '@/types/domain';

export const EMPTY_NUTRITION: NutritionFacts = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  micronutrients: {},
};

/** Keeps only finite numeric entries from a jsonb micronutrients value. */
export function parseMicronutrients(value: Json): Micronutrients {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Micronutrients = {};
  for (const [key, amount] of Object.entries(value)) {
    if (typeof amount === 'number' && Number.isFinite(amount)) out[key] = amount;
  }
  return out;
}

/** Rounds to one decimal place to avoid floating-point noise in sums. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Rounds to two decimal places, the precision of the database's nutrient columns. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function scaleNutrition(facts: NutritionFacts, factor: number): NutritionFacts {
  const micronutrients: Micronutrients = {};
  for (const [key, amount] of Object.entries(facts.micronutrients)) {
    micronutrients[key] = round1(amount * factor);
  }
  return {
    calories: round1(facts.calories * factor),
    proteinG: round1(facts.proteinG * factor),
    carbsG: round1(facts.carbsG * factor),
    fatG: round1(facts.fatG * factor),
    micronutrients,
  };
}

/** Label nutrients that `foods` stores in their own columns; anything else goes in `micros`. */
export const FOOD_NUTRIENT_COLUMNS = [
  'fiber_g',
  'sugar_g',
  'sat_fat_g',
  'sodium_mg',
  'cholesterol_mg',
] as const;

type FoodNutrientColumn = (typeof FOOD_NUTRIENT_COLUMNS)[number];

type FoodNutritionColumns = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  micros: Json;
} & Record<FoodNutrientColumn, number | null>;

export function nutritionFromFoodRow(row: FoodNutritionColumns): NutritionFacts {
  const micronutrients = parseMicronutrients(row.micros);
  for (const column of FOOD_NUTRIENT_COLUMNS) {
    const amount = row[column];
    if (amount !== null) micronutrients[column] = amount;
  }
  return {
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    micronutrients,
  };
}

export function nutritionToFoodRow(facts: NutritionFacts): FoodNutritionColumns {
  const micros: Micronutrients = { ...facts.micronutrients };
  const columns = {} as Record<FoodNutrientColumn, number | null>;
  for (const column of FOOD_NUTRIENT_COLUMNS) {
    columns[column] = micros[column] ?? null;
    delete micros[column];
  }
  return {
    calories: facts.calories,
    protein_g: facts.proteinG,
    carbs_g: facts.carbsG,
    fat_g: facts.fatG,
    micros,
    ...columns,
  };
}

type LogNutritionColumns = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: Json;
};

export function nutritionFromLogRow(row: LogNutritionColumns): NutritionFacts {
  return {
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    micronutrients: parseMicronutrients(row.nutrients),
  };
}

export function nutritionToLogRow(facts: NutritionFacts): LogNutritionColumns {
  return {
    calories: facts.calories,
    protein_g: facts.proteinG,
    carbs_g: facts.carbsG,
    fat_g: facts.fatG,
    nutrients: facts.micronutrients,
  };
}
