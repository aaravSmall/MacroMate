import { CALORIE_FLOOR_KCAL } from '@/constants/safety';
import {
  assessFormPace,
  birthDateForAge,
  buildOnboardingResult,
  convertUnits,
  INITIAL_ONBOARDING_FORM,
  type OnboardingForm,
  validateBodyStats,
} from '@/features/onboarding/logic/onboardingForm';

const now = new Date(2026, 9, 16, 12, 0);
const opts = { now, timezone: 'America/Chicago' };

const imperial: OnboardingForm = {
  ...INITIAL_ONBOARDING_FORM,
  units: 'imperial',
  sex: 'male',
  age: '40',
  weight: '198.4', // ≈ 90 kg
  heightFt: '5',
  heightIn: '11', // 71 in ≈ 180.3 cm
  activityLevel: 'moderate',
  goalType: 'lose',
  weeklyRate: 1,
  motivation: '  Feel better  ',
  dietaryRestrictions: ['Vegetarian'],
  allergies: [],
};

describe('validateBodyStats', () => {
  it('passes a complete form', () => {
    expect(validateBodyStats(imperial)).toEqual({});
  });

  it('flags missing and out-of-range values', () => {
    const errors = validateBodyStats({ ...INITIAL_ONBOARDING_FORM, age: '9' });
    expect(Object.keys(errors).sort()).toEqual(['age', 'height', 'sex', 'weight']);
  });

  it('accepts metric height and weight', () => {
    const metric = { ...imperial, units: 'metric' as const, weight: '90', heightCm: '180' };
    expect(validateBodyStats(metric)).toEqual({});
  });
});

describe('convertUnits', () => {
  it('converts entered weight and height to metric and back', () => {
    const metric = convertUnits(imperial, 'metric');
    expect(metric.units).toBe('metric');
    expect(metric.weight).toBe('90');
    expect(metric.heightCm).toBe('180');
    const back = convertUnits(metric, 'imperial');
    expect(back.weight).toBe('198.4');
    expect([back.heightFt, back.heightIn]).toEqual(['5', '11']);
  });

  it('clears the pace, since options differ per unit', () => {
    expect(convertUnits(imperial, 'metric').weeklyRate).toBeNull();
  });
});

describe('birthDateForAge', () => {
  it('gives a birth date that makes the person exactly that age today', () => {
    expect(birthDateForAge(40, now)).toBe('1986-10-16');
  });
});

describe('assessFormPace', () => {
  it('cautions on fast imperial and metric loss', () => {
    expect(assessFormPace({ ...imperial, weeklyRate: 2.5 })).toBe('caution');
    expect(assessFormPace({ ...imperial, units: 'metric', weeklyRate: 1.25 })).toBe('caution');
    expect(assessFormPace({ ...imperial, weeklyRate: 2 })).toBe('ok');
  });

  it('is ok for maintain regardless of a leftover rate', () => {
    expect(assessFormPace({ ...imperial, goalType: 'maintain', weeklyRate: 2.5 })).toBe('ok');
  });
});

describe('buildOnboardingResult', () => {
  it('returns null when answers are missing', () => {
    expect(buildOnboardingResult(INITIAL_ONBOARDING_FORM, opts)).toBeNull();
    expect(buildOnboardingResult({ ...imperial, weeklyRate: null }, opts)).toBeNull();
    expect(buildOnboardingResult({ ...imperial, activityLevel: null }, opts)).toBeNull();
  });

  it('builds the profile update, goal, and daily target', () => {
    const result = buildOnboardingResult(imperial, opts);
    expect(result).not.toBeNull();
    // BMR ≈ 10×90 + 6.25×180.34 − 200 + 5 ≈ 1832; ×1.55 ≈ 2840; −500 → 2340
    expect(result?.dailyTarget.target).toBe(2340);
    expect(result?.pace).toBe('ok');
    expect(result?.profileUpdate).toEqual({
      sex: 'male',
      birthDate: '1986-10-16',
      heightCm: 180.3,
      activityLevel: 'moderate',
      unitSystem: 'imperial',
      timezone: 'America/Chicago',
      motivation: 'Feel better',
      dietaryRestrictions: ['Vegetarian'],
      allergies: [],
      onboardedAt: now.toISOString(),
    });
    expect(result?.goal).toEqual({
      goalType: 'lose',
      startWeightKg: 89.99,
      targetWeightKg: null,
      targetBodyFatPct: null,
      paceKgPerWeek: 0.45,
      dailyCalorieTarget: 2340,
      macroTargets: { proteinG: 146, carbsG: 263, fatG: 78 },
    });
  });

  it('stores a zero rate for maintain', () => {
    const result = buildOnboardingResult(
      { ...imperial, goalType: 'maintain', weeklyRate: null },
      opts,
    );
    expect(result?.goal.paceKgPerWeek).toBe(0);
    expect(result?.dailyTarget.dailyAdjustment).toBe(0);
  });

  it('flags the calorie floor for an aggressive goal', () => {
    const result = buildOnboardingResult(
      {
        ...imperial,
        sex: 'female',
        age: '30',
        weight: '154',
        heightFt: '5',
        heightIn: '5',
        activityLevel: 'sedentary',
        weeklyRate: 2.5,
      },
      opts,
    );
    expect(result?.dailyTarget.floorApplied).toBe(true);
    expect(result?.dailyTarget.target).toBe(CALORIE_FLOOR_KCAL.female);
    expect(result?.pace).toBe('caution');
  });

  it('converts an optional target weight to kg', () => {
    const result = buildOnboardingResult({ ...imperial, targetWeight: '180' }, opts);
    expect(result?.goal.targetWeightKg).toBe(81.65);
  });
});
