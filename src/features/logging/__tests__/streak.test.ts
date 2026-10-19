import { currentStreak, longestStreak } from '@/features/logging/logic/streak';

const today = new Date(2026, 9, 16, 9, 0);
const keys = (...k: string[]) => new Set(k);

describe('currentStreak', () => {
  it('is 0 with no logs', () => {
    expect(currentStreak(keys(), today)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(currentStreak(keys('2026-10-16', '2026-10-15', '2026-10-14'), today)).toBe(3);
  });

  it('counts from yesterday when today has no log yet', () => {
    expect(currentStreak(keys('2026-10-15', '2026-10-14'), today)).toBe(2);
  });

  it('stops at the first gap', () => {
    expect(currentStreak(keys('2026-10-16', '2026-10-15', '2026-10-13'), today)).toBe(2);
  });

  it('is 0 when the last log was two or more days ago', () => {
    expect(currentStreak(keys('2026-10-14', '2026-10-13'), today)).toBe(0);
  });

  it('crosses month boundaries', () => {
    const nov2 = new Date(2026, 10, 2);
    expect(currentStreak(keys('2026-11-02', '2026-11-01', '2026-10-31'), nov2)).toBe(3);
  });
});

// Same cases as supabase/tests/longest_streak_test.sql.
describe('longestStreak', () => {
  it('is 0 with no logs and 1 for a single day', () => {
    expect(longestStreak(keys())).toBe(0);
    expect(longestStreak(keys('2026-10-16'))).toBe(1);
  });

  it('finds the longest run, not the latest', () => {
    expect(
      longestStreak(
        keys('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11'),
      ),
    ).toBe(4);
  });

  it('crosses month and year boundaries', () => {
    expect(longestStreak(keys('2026-10-30', '2026-10-31', '2026-11-01'))).toBe(3);
    expect(longestStreak(keys('2025-12-31', '2026-01-01'))).toBe(2);
  });

  it('is not affected by insertion order', () => {
    expect(longestStreak(keys('2026-10-03', '2026-10-01', '2026-10-02'))).toBe(3);
  });
});
