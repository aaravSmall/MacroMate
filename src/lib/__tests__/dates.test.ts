import {
  addDays,
  fromDateKey,
  startOfLocalDay,
  startOfNextLocalDay,
  toDateKey,
  toDateKeyInTimeZone,
} from '@/lib/dates';

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

describe('toDateKeyInTimeZone', () => {
  // 03:30 UTC on Oct 17 is still the evening of Oct 16 in New York.
  const instant = new Date('2026-10-17T03:30:00.000Z');

  it('uses the calendar day in the given timezone', () => {
    expect(toDateKeyInTimeZone(instant, 'America/New_York')).toBe('2026-10-16');
    expect(toDateKeyInTimeZone(instant, 'Asia/Tokyo')).toBe('2026-10-17');
    expect(toDateKeyInTimeZone(instant, 'UTC')).toBe('2026-10-17');
  });

  it('falls back to the device day for an unknown timezone', () => {
    expect(toDateKeyInTimeZone(instant, 'Not/AZone')).toBe(toDateKey(instant));
  });
});
