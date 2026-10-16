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

type NutritionRow = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  micronutrients: Json;
};

export function nutritionFromRow(row: NutritionRow): NutritionFacts {
  return {
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    micronutrients: parseMicronutrients(row.micronutrients),
  };
}

export function nutritionToRow(facts: NutritionFacts): NutritionRow {
  return {
    calories: facts.calories,
    protein_g: facts.proteinG,
    carbs_g: facts.carbsG,
    fat_g: facts.fatG,
    micronutrients: facts.micronutrients,
  };
}
