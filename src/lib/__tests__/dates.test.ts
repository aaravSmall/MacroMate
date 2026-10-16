import { addDays, fromDateKey, startOfLocalDay, startOfNextLocalDay, toDateKey } from '@/lib/dates';

describe('dates', () => {
  const date = new Date(2026, 9, 16, 15, 45, 12);

  it('finds local day bounds', () => {
    expect(startOfLocalDay(date)).toEqual(new Date(2026, 9, 16));
    expect(startOfNextLocalDay(date)).toEqual(new Date(2026, 9, 17));
  });

  it('rolls over month and year boundaries', () => {
    expect(startOfNextLocalDay(new Date(2026, 11, 31, 23))).toEqual(new Date(2027, 0, 1));
    expect(addDays(new Date(2026, 2, 1), -1)).toEqual(new Date(2026, 1, 28));
  });

  it('round-trips date keys', () => {
    expect(toDateKey(date)).toBe('2026-10-16');
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(fromDateKey('2026-10-16')).toEqual(new Date(2026, 9, 16));
  });
});
