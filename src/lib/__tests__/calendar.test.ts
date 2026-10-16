import { buildMonthGrid } from '@/lib/calendar';

describe('buildMonthGrid', () => {
  it('lays out October 2026 starting on a Thursday', () => {
    const weeks = buildMonthGrid(2026, 9);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0]?.[4]).toEqual(new Date(2026, 9, 1));
    expect(weeks[4]?.[6]).toEqual(new Date(2026, 9, 31));
  });

  it('pads every week to 7 days', () => {
    for (const week of buildMonthGrid(2026, 1)) expect(week).toHaveLength(7);
  });

  it('includes every day of the month exactly once', () => {
    const days = buildMonthGrid(2028, 1).flat().filter(Boolean);
    expect(days).toHaveLength(29);
  });
});
