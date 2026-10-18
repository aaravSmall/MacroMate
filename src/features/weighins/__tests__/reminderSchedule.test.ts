import {
  nextReminderDates,
  parseReminderTime,
  type ReminderSettings,
  zonedTimeToUtc,
} from '@/features/weighins/logic/reminderSchedule';

const NY = 'America/New_York';
const iso = (dates: Date[]) => dates.map((d) => d.toISOString());
const base: ReminderSettings = {
  frequency: 'weekly',
  weekday: 0, // Sunday
  time: '08:00:00',
  timeZone: NY,
  anchor: new Date('2026-10-01T12:00:00Z'),
};

describe('zonedTimeToUtc', () => {
  it('converts local wall time in EDT and EST', () => {
    expect(zonedTimeToUtc({ y: 2026, m: 10, d: 25 }, 8, 0, NY).toISOString()).toBe(
      '2026-10-25T12:00:00.000Z',
    );
    expect(zonedTimeToUtc({ y: 2026, m: 11, d: 8 }, 8, 0, NY).toISOString()).toBe(
      '2026-11-08T13:00:00.000Z',
    );
  });

  it('moves a non-existent spring-forward time forward by the gap', () => {
    // 2026-03-08 02:30 doesn't exist in New York; 03:30 EDT = 07:30Z.
    expect(zonedTimeToUtc({ y: 2026, m: 3, d: 8 }, 2, 30, NY).toISOString()).toBe(
      '2026-03-08T07:30:00.000Z',
    );
  });

  it('uses the first occurrence of a repeated fall-back time', () => {
    // 2026-11-01 01:30 happens twice; the first is EDT (05:30Z), the second EST (06:30Z).
    expect(zonedTimeToUtc({ y: 2026, m: 11, d: 1 }, 1, 30, NY).toISOString()).toBe(
      '2026-11-01T05:30:00.000Z',
    );
  });

  it('works in zones without DST and across the date line', () => {
    expect(zonedTimeToUtc({ y: 2026, m: 10, d: 25 }, 8, 0, 'Asia/Kolkata').toISOString()).toBe(
      '2026-10-25T02:30:00.000Z',
    );
    expect(zonedTimeToUtc({ y: 2026, m: 10, d: 25 }, 8, 0, 'Pacific/Auckland').toISOString()).toBe(
      '2026-10-24T19:00:00.000Z',
    );
  });
});

describe('nextReminderDates: weekly', () => {
  it('keeps 8:00 local across the November DST change', () => {
    const now = new Date('2026-10-20T12:00:00Z'); // Tue
    expect(iso(nextReminderDates(base, { now, count: 3 }))).toEqual([
      '2026-10-25T12:00:00.000Z', // Sun 8:00 EDT
      '2026-11-01T13:00:00.000Z', // Sun 8:00 EST (DST ended that morning)
      '2026-11-08T13:00:00.000Z',
    ]);
  });

  it('keeps 8:00 local across the March DST change', () => {
    const now = new Date('2026-03-02T12:00:00Z');
    expect(iso(nextReminderDates(base, { now, count: 2 }))).toEqual([
      '2026-03-08T12:00:00.000Z', // 8:00 EDT on the spring-forward day
      '2026-03-15T12:00:00.000Z',
    ]);
  });

  it("includes today if the time hasn't passed, skips it if it has", () => {
    const sundayEarly = new Date('2026-10-25T11:00:00Z'); // 7:00 EDT
    expect(nextReminderDates(base, { now: sundayEarly, count: 1 })[0]?.toISOString()).toBe(
      '2026-10-25T12:00:00.000Z',
    );
    const sundayLate = new Date('2026-10-25T12:00:00Z'); // exactly 8:00: not strictly after
    expect(nextReminderDates(base, { now: sundayLate, count: 1 })[0]?.toISOString()).toBe(
      '2026-11-01T13:00:00.000Z',
    );
  });

  it('uses the local day, not UTC', () => {
    // 2026-10-24 23:30 in New York is already Sunday in UTC.
    const now = new Date('2026-10-25T03:30:00Z');
    expect(
      nextReminderDates(
        { ...base, weekday: 6, time: '23:45' },
        { now, count: 1 },
      )[0]?.toISOString(),
    ).toBe(
      '2026-10-25T03:45:00.000Z', // Sat 23:45 EDT
    );
  });
});

describe('nextReminderDates: biweekly', () => {
  it('runs every 14 days from the first weekday on or after the anchor', () => {
    const settings = {
      ...base,
      frequency: 'biweekly' as const,
      anchor: new Date('2026-10-04T13:00:00Z'),
    }; // Sun Oct 4
    const now = new Date('2026-10-06T12:00:00Z');
    expect(iso(nextReminderDates(settings, { now, count: 3 }))).toEqual([
      '2026-10-18T12:00:00.000Z',
      '2026-11-01T13:00:00.000Z',
      '2026-11-15T13:00:00.000Z',
    ]);
  });

  it('stays on the same fortnight cycle for an old anchor', () => {
    const settings = {
      ...base,
      frequency: 'biweekly' as const,
      anchor: new Date('2026-01-04T13:00:00Z'),
    };
    const now = new Date('2026-10-20T12:00:00Z');
    const [first, second] = nextReminderDates(settings, { now, count: 2 });
    const days = (first!.getTime() - new Date('2026-01-04T13:00:00Z').getTime()) / 86_400_000;
    expect(Math.round(days) % 14).toBe(0);
    expect(Math.round((second!.getTime() - first!.getTime()) / 86_400_000)).toBe(14);
  });

  it('anchors mid-week to the next chosen weekday', () => {
    const settings = {
      ...base,
      frequency: 'biweekly' as const,
      weekday: 1,
      anchor: new Date('2026-10-14T15:00:00Z'),
    }; // Wed
    const now = new Date('2026-10-14T16:00:00Z');
    expect(nextReminderDates(settings, { now, count: 1 })[0]?.toISOString()).toBe(
      '2026-10-19T12:00:00.000Z',
    ); // Mon
  });
});

describe('nextReminderDates: monthly', () => {
  it('uses the first chosen weekday of each month', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    expect(iso(nextReminderDates({ ...base, frequency: 'monthly' }, { now, count: 3 }))).toEqual([
      '2026-11-01T13:00:00.000Z', // first Sunday of November (also the DST change)
      '2026-12-06T13:00:00.000Z',
      '2027-01-03T13:00:00.000Z',
    ]);
  });

  it("includes this month's when it's still ahead", () => {
    const now = new Date('2026-11-01T10:00:00Z');
    expect(
      nextReminderDates({ ...base, frequency: 'monthly' }, { now, count: 1 })[0]?.toISOString(),
    ).toBe('2026-11-01T13:00:00.000Z');
  });
});

describe('parseReminderTime', () => {
  it('parses and clamps', () => {
    expect(parseReminderTime('08:00:00')).toEqual([8, 0]);
    expect(parseReminderTime('19:45')).toEqual([19, 45]);
    expect(parseReminderTime('99:99')).toEqual([23, 59]);
    expect(parseReminderTime('')).toEqual([0, 0]);
  });
});
