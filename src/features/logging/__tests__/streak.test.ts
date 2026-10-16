import { currentStreak } from '@/features/logging/logic/streak';

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
