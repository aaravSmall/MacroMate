import { CALORIE_FLOOR_KCAL } from '@/constants/safety';
import {
  ACTIVITY_MULTIPLIERS,
  type BodyStats,
  calculateBMR,
  calculateDailyTarget,
  calculateTDEE,
  calorieFloorFor,
  isBelowRecommendedFloor,
  targetRecommendationCopy,
  KCAL_PER_LB,
} from '@/features/goals';

// 30-year-old, 70 kg, 165 cm.
const femaleMetric: BodyStats = {
  sex: 'female',
  ageYears: 30,
  units: 'metric',
  weight: 70,
  height: 165,
};
// Same person in imperial units (70 kg ≈ 154.324 lb, 165 cm ≈ 64.961 in).
const femaleImperial: BodyStats = {
  sex: 'female',
  ageYears: 30,
  units: 'imperial',
  weight: 70 / 0.45359237,
  height: 165 / 2.54,
};
const maleMetric: BodyStats = {
  sex: 'male',
  ageYears: 40,
  units: 'metric',
  weight: 90,
  height: 180,
};

describe('calculateBMR (Mifflin-St Jeor)', () => {
  it('matches the published formula for a female', () => {
    // 10×70 + 6.25×165 − 5×30 − 161
    expect(calculateBMR(femaleMetric)).toBeCloseTo(1420.25, 5);
  });

  it('matches the published formula for a male', () => {
    // 10×90 + 6.25×180 − 5×40 + 5
    expect(calculateBMR(maleMetric)).toBeCloseTo(1830, 5);
  });

  it('gives the same result for metric and imperial inputs', () => {
    expect(calculateBMR(femaleImperial)).toBeCloseTo(calculateBMR(femaleMetric), 5);
  });

  it('decreases with age', () => {
    expect(calculateBMR({ ...femaleMetric, ageYears: 31 })).toBeCloseTo(1415.25, 5);
  });
});

describe('calculateTDEE', () => {
  it.each(Object.entries(ACTIVITY_MULTIPLIERS))(
    'applies the %s multiplier',
    (level, multiplier) => {
      expect(calculateTDEE(maleMetric, level as keyof typeof ACTIVITY_MULTIPLIERS)).toBeCloseTo(
        1830 * multiplier,
        5,
      );
    },
  );

  it('uses the standard multipliers', () => {
    expect(ACTIVITY_MULTIPLIERS).toEqual({
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    });
  });
});

describe('calculateDailyTarget', () => {
  const male = { ...maleMetric, activityLevel: 'moderate' as const }; // TDEE 2836.5

  it('uses ~3500 kcal per lb', () => {
    expect(KCAL_PER_LB).toBe(3500);
  });

  it('returns TDEE for maintain and ignores the rate', () => {
    const result = calculateDailyTarget({
      profile: male,
      goalType: 'maintain',
      weeklyRate: { amount: 2, unit: 'lb' },
    });
    expect(result.dailyAdjustment).toBe(0);
    expect(result.target).toBe(2840);
    expect(result.floorApplied).toBe(false);
  });

  it('subtracts 500 kcal/day per lb/week when losing', () => {
    const result = calculateDailyTarget({
      profile: male,
      goalType: 'lose',
      weeklyRate: { amount: 1, unit: 'lb' },
    });
    expect(result.dailyAdjustment).toBeCloseTo(500, 5);
    expect(result.target).toBe(2340);
  });

  it('adds calories when gaining', () => {
    const result = calculateDailyTarget({
      profile: male,
      goalType: 'gain',
      weeklyRate: { amount: 0.5, unit: 'lb' },
    });
    expect(result.target).toBe(3090);
  });

  it('accepts a metric weekly rate', () => {
    const kg = calculateDailyTarget({
      profile: male,
      goalType: 'lose',
      weeklyRate: { amount: 0.45359237, unit: 'kg' },
    });
    expect(kg.target).toBe(2340);
  });

  it('gives the same target for metric and imperial body stats', () => {
    const args = { goalType: 'lose' as const, weeklyRate: { amount: 0.5, unit: 'lb' as const } };
    const metric = calculateDailyTarget({
      ...args,
      profile: { ...femaleMetric, activityLevel: 'light' },
    });
    const imperial = calculateDailyTarget({
      ...args,
      profile: { ...femaleImperial, activityLevel: 'light' },
    });
    expect(imperial.target).toBe(metric.target);
  });

  describe('calorie floor', () => {
    const female = { ...femaleMetric, activityLevel: 'sedentary' as const }; // TDEE 1704.3

    it('does not apply when the target equals the floor', () => {
      // 1704.3 − 500 = 1204.3 → rounds to 1200, exactly the floor.
      const result = calculateDailyTarget({
        profile: female,
        goalType: 'lose',
        weeklyRate: { amount: 1, unit: 'lb' },
      });
      expect(result.target).toBe(1200);
      expect(result.floorApplied).toBe(false);
    });

    it('recommends the floor when the target falls below it', () => {
      const result = calculateDailyTarget({
        profile: female,
        goalType: 'lose',
        weeklyRate: { amount: 2, unit: 'lb' },
      });
      expect(result.calculatedTarget).toBe(700);
      expect(result.target).toBe(CALORIE_FLOOR_KCAL.female);
      expect(result.floor).toBe(1200);
      expect(result.floorApplied).toBe(true);
    });

    it('uses the male floor for male profiles', () => {
      const result = calculateDailyTarget({
        profile: { ...maleMetric, activityLevel: 'sedentary' }, // TDEE 2196
        goalType: 'lose',
        weeklyRate: { amount: 2, unit: 'lb' },
      });
      expect(result.calculatedTarget).toBe(1200);
      expect(result.target).toBe(1500);
      expect(result.floorApplied).toBe(true);
    });

    it('applies even to maintain when TDEE is below the floor', () => {
      const small = {
        sex: 'female' as const,
        ageYears: 80,
        units: 'metric' as const,
        weight: 40,
        height: 145,
        activityLevel: 'sedentary' as const,
      };
      const result = calculateDailyTarget({
        profile: small,
        goalType: 'maintain',
        weeklyRate: { amount: 0, unit: 'lb' },
      });
      expect(result.calculatedTarget).toBeLessThan(1200);
      expect(result.target).toBe(1200);
      expect(result.floorApplied).toBe(true);
    });
  });
});

describe('calorieFloorFor', () => {
  it('uses the sex-specific floor', () => {
    expect(calorieFloorFor('female')).toBe(1200);
    expect(calorieFloorFor('male')).toBe(1500);
  });

  it('falls back to the higher floor when sex is not set', () => {
    expect(calorieFloorFor(null)).toBe(1500);
    expect(calorieFloorFor(undefined)).toBe(1500);
  });
});

describe('isBelowRecommendedFloor (manual targets)', () => {
  it('flags targets under the floor without blocking them', () => {
    expect(isBelowRecommendedFloor(1100, 'female')).toBe(true);
    expect(isBelowRecommendedFloor(1200, 'female')).toBe(false);
    expect(isBelowRecommendedFloor(1400, 'male')).toBe(true);
    expect(isBelowRecommendedFloor(1400, null)).toBe(true);
    expect(isBelowRecommendedFloor(1500, null)).toBe(false);
  });
});

describe('targetRecommendationCopy', () => {
  it('reads as a normal recommendation', () => {
    expect(targetRecommendationCopy(1200)).toBe(
      'Most people at your goal do well around 1,200 cal.',
    );
  });

  it('never mentions a floor, minimum, rule, or limit', () => {
    const copy = targetRecommendationCopy(1500).toLowerCase();
    for (const phrase of [
      'floor',
      'minimum',
      'at least',
      'rule',
      'limit',
      "can't",
      'cannot',
      'not allowed',
      'must',
      'blocked',
    ]) {
      expect(copy).not.toContain(phrase);
    }
  });
});
