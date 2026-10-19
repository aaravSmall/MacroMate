import { buildGoalChange, type GoalChangeInput } from '@/features/goals/logic/goalChange';

const base: GoalChangeInput = {
  profile: {
    sex: 'female',
    birthDate: '1996-01-01',
    heightCm: 165,
    activityLevel: 'light',
    unitSystem: 'imperial',
  },
  currentWeightKg: 70,
  goalType: 'lose',
  weeklyRate: 1,
  targetWeightKg: 65,
  now: new Date(2026, 9, 19),
};

describe('buildGoalChange', () => {
  it('returns ok for a moderate loss pace', () => {
    expect(buildGoalChange(base)?.pace).toBe('ok');
  });

  it('flags losing faster than 2 lb/week, without blocking the goal', () => {
    const change = buildGoalChange({ ...base, weeklyRate: 2.5 });
    expect(change?.pace).toBe('caution');
    expect(change?.goal.paceKgPerWeek).toBeCloseTo(1.13, 2);
  });

  it('flags gaining faster than 1 lb/week', () => {
    expect(buildGoalChange({ ...base, goalType: 'gain', weeklyRate: 1 })?.pace).toBe('ok');
    expect(buildGoalChange({ ...base, goalType: 'gain', weeklyRate: 1.5 })?.pace).toBe('caution');
  });

  it('uses kg/week for metric profiles', () => {
    const metric = { ...base, profile: { ...base.profile, unitSystem: 'metric' as const } };
    expect(buildGoalChange({ ...metric, weeklyRate: 0.75 })?.pace).toBe('ok');
    expect(buildGoalChange({ ...metric, weeklyRate: 1.25 })?.pace).toBe('caution');
  });

  it('never cautions or keeps a target weight for maintain', () => {
    const change = buildGoalChange({ ...base, goalType: 'maintain', weeklyRate: null });
    expect(change?.pace).toBe('ok');
    expect(change?.goal).toMatchObject({ paceKgPerWeek: 0, targetWeightKg: null });
  });

  it('returns null when profile stats or weight are missing', () => {
    expect(buildGoalChange({ ...base, currentWeightKg: null })).toBeNull();
    expect(buildGoalChange({ ...base, profile: { ...base.profile, sex: null } })).toBeNull();
    expect(buildGoalChange({ ...base, weeklyRate: null })).toBeNull();
  });
});
