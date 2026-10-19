import { GOAL_CELEBRATE_RANGE } from '@/constants/safety';
import {
  assessDayStatus,
  assessPace,
  type DayStatus,
  feedbackForDayStatus,
  paceCautionCopy,
} from '@/features/goals';

describe('assessPace', () => {
  describe('lose', () => {
    it.each([0, 0.5, 1, 1.5, 2])('%s lb/week is ok', (amount) => {
      expect(assessPace({ amount, unit: 'lb' }, 'lose')).toBe('ok');
    });

    it.each([2.01, 2.5, 3, 10])('%s lb/week gets a caution', (amount) => {
      expect(assessPace({ amount, unit: 'lb' }, 'lose')).toBe('caution');
    });

    it('treats ~0.907 kg (2 lb) as ok and 1 kg as caution', () => {
      expect(assessPace({ amount: 0.907, unit: 'kg' }, 'lose')).toBe('ok');
      expect(assessPace({ amount: 1, unit: 'kg' }, 'lose')).toBe('caution');
    });
  });

  describe('gain', () => {
    it('allows gains up to the default threshold', () => {
      expect(assessPace({ amount: 0.5, unit: 'lb' }, 'gain')).toBe('ok');
      expect(assessPace({ amount: 1, unit: 'lb' }, 'gain')).toBe('ok');
    });

    it('cautions above the default threshold', () => {
      expect(assessPace({ amount: 1.5, unit: 'lb' }, 'gain')).toBe('caution');
      expect(assessPace({ amount: 1, unit: 'kg' }, 'gain')).toBe('caution');
    });

    it('respects a configured threshold', () => {
      expect(assessPace({ amount: 1.5, unit: 'lb' }, 'gain', { maxGainLbPerWeek: 2 })).toBe('ok');
      expect(assessPace({ amount: 0.75, unit: 'lb' }, 'gain', { maxGainLbPerWeek: 0.5 })).toBe(
        'caution',
      );
    });
  });

  it('is always ok for maintain', () => {
    expect(assessPace({ amount: 5, unit: 'lb' }, 'maintain')).toBe('ok');
  });

  it('only ever returns ok or caution', () => {
    const results = new Set<string>();
    for (const goal of ['lose', 'maintain', 'gain'] as const) {
      for (const amount of [0, 1, 2, 3, 5, 20, -4]) {
        results.add(assessPace({ amount, unit: 'lb' }, goal));
      }
    }
    expect([...results].sort()).toEqual(['caution', 'ok']);
  });

  it('has caring caution copy that points to a doctor', () => {
    expect(paceCautionCopy('lose').message).toMatch(/doctor/);
    expect(paceCautionCopy('gain').message).toMatch(/doctor/);
  });
});

describe('assessDayStatus', () => {
  const target = 2000;
  const band = GOAL_CELEBRATE_RANGE;

  it('defaults to a 200 kcal band', () => {
    expect(band).toBe(200);
  });

  it('is near_goal at the exact target and at both band edges (inclusive)', () => {
    expect(assessDayStatus(2000, target)).toBe('near_goal');
    expect(assessDayStatus(target - band, target)).toBe('near_goal');
    expect(assessDayStatus(target + band, target)).toBe('near_goal');
  });

  it('is over just above the band', () => {
    expect(assessDayStatus(target + band + 1, target)).toBe('over');
  });

  it('is in_progress below the band while the day is ongoing', () => {
    expect(assessDayStatus(target - band - 1, target)).toBe('in_progress');
    expect(assessDayStatus(0, target)).toBe('in_progress');
  });

  it('is under below the band once the day is complete', () => {
    expect(assessDayStatus(target - band - 1, target, { isDayComplete: true })).toBe('under');
    expect(assessDayStatus(target - band, target, { isDayComplete: true })).toBe('near_goal');
  });

  it('respects a configured band', () => {
    expect(assessDayStatus(1900, target, { band: 50 })).toBe('in_progress');
    expect(assessDayStatus(1950, target, { band: 50 })).toBe('near_goal');
  });
});

describe('feedbackForDayStatus', () => {
  it('celebrates only near_goal', () => {
    expect(feedbackForDayStatus('near_goal')).toBe('celebrate');
  });

  it('never celebrates under goal; it gets a gentle nudge', () => {
    expect(feedbackForDayStatus('under')).toBe('gentle_nudge');
  });

  it('stays quiet for over and in_progress', () => {
    expect(feedbackForDayStatus('over')).toBe('none');
    expect(feedbackForDayStatus('in_progress')).toBe('none');
  });

  it('never celebrates a day that ended well under target', () => {
    for (const eaten of [0, 500, 1000, 1799]) {
      const status: DayStatus = assessDayStatus(eaten, 2000, { isDayComplete: true });
      expect(feedbackForDayStatus(status)).not.toBe('celebrate');
    }
  });
});
