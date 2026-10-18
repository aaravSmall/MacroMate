import {
  nutritionFromFoodRow,
  nutritionFromLogRow,
  nutritionToFoodRow,
  nutritionToLogRow,
  parseMicronutrients,
  scaleNutrition,
} from '@/lib/nutrition';

describe('parseMicronutrients', () => {
  it('keeps finite numbers only', () => {
    expect(parseMicronutrients({ sodium_mg: 74, note: 'x', bad: null, fiber_g: 2.5 })).toEqual({
      sodium_mg: 74,
      fiber_g: 2.5,
    });
  });

  it('returns an empty object for non-objects', () => {
    expect(parseMicronutrients(null)).toEqual({});
    expect(parseMicronutrients([1, 2])).toEqual({});
    expect(parseMicronutrients('x')).toEqual({});
  });
});

describe('scaleNutrition', () => {
  it('scales every value and rounds to one decimal', () => {
    expect(
      scaleNutrition(
        { calories: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4, micronutrients: { fiber_g: 3.1 } },
        1 / 3,
      ),
    ).toEqual({
      calories: 35,
      proteinG: 0.4,
      carbsG: 9,
      fatG: 0.1,
      micronutrients: { fiber_g: 1 },
    });
  });
});

describe('food nutrient columns', () => {
  const facts = {
    calories: 190,
    proteinG: 7,
    carbsG: 7,
    fatG: 16,
    micronutrients: { sodium_mg: 140, sat_fat_g: 3.3, magnesium_mg: 49 },
  };

  it('splits label nutrients into columns and the rest into micros', () => {
    expect(nutritionToFoodRow(facts)).toEqual({
      calories: 190,
      protein_g: 7,
      carbs_g: 7,
      fat_g: 16,
      fiber_g: null,
      sugar_g: null,
      sat_fat_g: 3.3,
      sodium_mg: 140,
      cholesterol_mg: null,
      micros: { magnesium_mg: 49 },
    });
  });

  it('round-trips through a row', () => {
    expect(nutritionFromFoodRow(nutritionToFoodRow(facts))).toEqual(facts);
  });
});

describe('log nutrients', () => {
  it('stores extra nutrients in the nutrients jsonb', () => {
    const facts = { calories: 90, proteinG: 1, carbsG: 2, fatG: 3, micronutrients: { fiber_g: 4 } };
    expect(nutritionToLogRow(facts)).toEqual({
      calories: 90,
      protein_g: 1,
      carbs_g: 2,
      fat_g: 3,
      nutrients: { fiber_g: 4 },
    });
    expect(nutritionFromLogRow(nutritionToLogRow(facts))).toEqual(facts);
  });
});
