import { DEFAULT_MACRO_SPLIT, defaultMacroTargets } from '@/features/goals';

describe('defaultMacroTargets', () => {
  it('splits 2000 kcal into gram targets', () => {
    // 500 kcal protein / 4, 900 kcal carbs / 4, 600 kcal fat / 9
    expect(defaultMacroTargets(2000)).toEqual({ proteinG: 125, carbsG: 225, fatG: 67 });
  });

  it('uses a split that sums to 100%', () => {
    const { protein, carbs, fat } = DEFAULT_MACRO_SPLIT;
    expect(protein + carbs + fat).toBeCloseTo(1, 10);
  });
});
