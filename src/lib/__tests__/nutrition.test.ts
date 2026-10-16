import { parseMicronutrients, scaleNutrition } from '@/lib/nutrition';

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
