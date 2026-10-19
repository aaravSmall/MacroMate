import {
  chartScale,
  linePath,
  movingAverage,
  pointsInRange,
  type TrendPoint,
} from '@/features/weighins/logic/trend';
import type { WeighIn } from '@/types/domain';

const now = new Date('2026-10-19T12:00:00Z');
const day = 24 * 60 * 60 * 1000;

function weighIn(daysAgo: number, weightKg: number): WeighIn {
  const at = new Date(now.getTime() - daysAgo * day).toISOString();
  return {
    id: String(daysAgo),
    measuredAt: at,
    localDate: at.slice(0, 10),
    weightKg,
    bodyFatPct: null,
  };
}

describe('pointsInRange', () => {
  const all = [
    weighIn(200, 80),
    weighIn(100, 78),
    weighIn(40, 77),
    weighIn(10, 76),
    weighIn(0, 75.5),
  ];

  it('returns points oldest first', () => {
    const times = pointsInRange([...all].reverse(), 'All', now).map((p) => p.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('filters to the range', () => {
    expect(pointsInRange(all, '1M', now).map((p) => p.weightKg)).toEqual([76, 75.5]);
    expect(pointsInRange(all, '3M', now).map((p) => p.weightKg)).toEqual([77, 76, 75.5]);
    expect(pointsInRange(all, '6M', now).map((p) => p.weightKg)).toEqual([78, 77, 76, 75.5]);
    expect(pointsInRange(all, 'All', now)).toHaveLength(5);
  });

  it('handles no weigh-ins', () => {
    expect(pointsInRange([], '1M', now)).toEqual([]);
  });
});

describe('movingAverage', () => {
  const p = (d: number, kg: number): TrendPoint => ({ time: d * day, weightKg: kg });

  it('averages the trailing window, including the current point', () => {
    const avg = movingAverage([p(0, 80), p(1, 82), p(2, 81)], 7).map((x) => x.weightKg);
    expect(avg).toEqual([80, 81, 81]);
  });

  it('drops points older than the window', () => {
    const avg = movingAverage([p(0, 90), p(7, 80), p(8, 82)], 7).map((x) => x.weightKg);
    // At day 7, day 0 is exactly 7 days old and falls out of a 7-day window.
    expect(avg).toEqual([90, 80, 81]);
  });

  it('keeps timestamps and handles empty input', () => {
    expect(movingAverage([p(3, 70)]).map((x) => x.time)).toEqual([3 * day]);
    expect(movingAverage([])).toEqual([]);
  });
});

describe('chartScale', () => {
  const points: TrendPoint[] = [
    { time: 0, weightKg: 80 },
    { time: 10, weightKg: 78 },
  ];

  it('maps the first and last points to the edges, heavier higher', () => {
    const scale = chartScale(points, { width: 100, height: 50 });
    expect(scale?.x(0)).toBe(0);
    expect(scale?.x(10)).toBe(100);
    expect(scale && scale.y(80)).toBeLessThan(scale ? scale.y(78) : 0);
  });

  it('includes the goal weight in the vertical range', () => {
    const scale = chartScale(points, { width: 100, height: 50, goalKg: 70 });
    expect(scale && scale.minKg).toBeLessThan(70);
    const y = scale?.y(70) ?? -1;
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThanOrEqual(50);
  });

  it('centers a single point and pads a flat line', () => {
    const scale = chartScale([{ time: 5, weightKg: 75 }], { width: 100, height: 50 });
    expect(scale?.x(5)).toBe(50);
    expect(scale?.y(75)).toBe(25);
  });

  it('returns null without points and builds a path with them', () => {
    expect(chartScale([], { width: 100, height: 50 })).toBeNull();
    const scale = chartScale(points, { width: 100, height: 50 });
    expect(scale && linePath(points, scale)).toMatch(/^M0\.0 [\d.]+ L100\.0 [\d.]+$/);
  });
});
