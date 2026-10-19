import { GOAL_CELEBRATE_RANGE } from '@/constants/safety';
import {
  endOfDayFeedback,
  NEAR_GOAL_CELEBRATION,
  snackIdeasFor,
  UNDER_GOAL_NUDGE,
} from '@/features/goals';

const target = 2000;
const today = '2026-10-19';
const base = { target, dateKey: today, todayKey: today, localHour: 20, hasLogs: true };

describe('endOfDayFeedback', () => {
  it('celebrates within the range on either side, inclusive', () => {
    for (const eaten of [target, target - GOAL_CELEBRATE_RANGE, target + GOAL_CELEBRATE_RANGE]) {
      expect(endOfDayFeedback({ ...base, eaten })).toBe('celebrate');
    }
  });

  it('nudges, never celebrates, when well under target', () => {
    for (const eaten of [0, 500, target - GOAL_CELEBRATE_RANGE - 1]) {
      expect(endOfDayFeedback({ ...base, eaten })).toBe('gentle_nudge');
    }
  });

  it('shows nothing when over target', () => {
    expect(endOfDayFeedback({ ...base, eaten: target + GOAL_CELEBRATE_RANGE + 1 })).toBe('none');
    expect(endOfDayFeedback({ ...base, eaten: target * 2 })).toBe('none');
  });

  it('waits until 7pm for today', () => {
    expect(endOfDayFeedback({ ...base, eaten: 500, localHour: 18 })).toBe('none');
    expect(endOfDayFeedback({ ...base, eaten: target, localHour: 12 })).toBe('none');
    expect(endOfDayFeedback({ ...base, eaten: 500, localHour: 19 })).toBe('gentle_nudge');
  });

  it('evaluates past days at any hour', () => {
    const past = { ...base, dateKey: '2026-10-18', localHour: 8 };
    expect(endOfDayFeedback({ ...past, eaten: 500 })).toBe('gentle_nudge');
    expect(endOfDayFeedback({ ...past, eaten: target - 50 })).toBe('celebrate');
  });

  it('shows nothing for empty days, future days, no target, or numbers-off', () => {
    expect(endOfDayFeedback({ ...base, eaten: 0, hasLogs: false })).toBe('none');
    expect(endOfDayFeedback({ ...base, eaten: 500, dateKey: '2026-10-20' })).toBe('none');
    expect(endOfDayFeedback({ ...base, eaten: 500, target: 0 })).toBe('none');
    expect(endOfDayFeedback({ ...base, eaten: target, numbersOff: true })).toBe('none');
  });

  it('never uses congratulatory copy in the under-goal nudge', () => {
    const copy = `${UNDER_GOAL_NUDGE.title} ${UNDER_GOAL_NUDGE.message}`.toLowerCase();
    for (const word of ['great', 'nice', 'congrat', 'well done', 'nicely', 'good job', 'proud']) {
      expect(copy).not.toContain(word);
    }
    expect(NEAR_GOAL_CELEBRATION.message).toMatch(/close to your goal/);
  });
});

describe('snackIdeasFor', () => {
  const none = { allergies: [], restrictions: [] };

  it('leads with protein bar, Greek yogurt, trail mix, and PB toast', () => {
    expect(snackIdeasFor(none).map((s) => s.name)).toEqual([
      'Protein bar',
      'Greek yogurt with berries',
      'Trail mix (about ¼ cup)',
      'Peanut butter toast',
    ]);
  });

  it('filters by allergies', () => {
    const names = snackIdeasFor({ allergies: ['Peanuts'], restrictions: [] }).map((s) => s.name);
    expect(names).not.toContain('Trail mix (about ¼ cup)');
    expect(names).not.toContain('Peanut butter toast');
    expect(names).toContain('Protein bar');
  });

  it('filters by restrictions', () => {
    const names = snackIdeasFor({ allergies: [], restrictions: ['Vegan', 'Gluten-free'] }).map(
      (s) => s.name,
    );
    expect(names).toEqual([
      'Trail mix (about ¼ cup)',
      'Banana',
      'Hummus with carrots and cucumber',
      'Apple with sunflower seed butter',
    ]);
  });
});
