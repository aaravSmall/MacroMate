/**
 * Weight trend chart math. Pure: filtering by range, a trailing moving average, and scaling to
 * chart coordinates. No colors or judgment here; the chart is neutral by design.
 */
import type { WeighIn } from '@/types/domain';

export type TrendRange = '1M' | '3M' | '6M' | 'All';
export const TREND_RANGES: readonly TrendRange[] = ['1M', '3M', '6M', 'All'];

const RANGE_MONTHS: Record<Exclude<TrendRange, 'All'>, number> = { '1M': 1, '3M': 3, '6M': 6 };

/** Days in the trailing moving average. */
export const TREND_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TrendPoint = { time: number; weightKg: number };

/** Weigh-ins in the range, oldest first. */
export function pointsInRange(
  weighIns: readonly WeighIn[],
  range: TrendRange,
  now: Date,
): TrendPoint[] {
  const points = weighIns
    .map((w) => ({ time: new Date(w.measuredAt).getTime(), weightKg: w.weightKg }))
    .sort((a, b) => a.time - b.time);
  if (range === 'All') return points;
  const start = new Date(now);
  start.setMonth(start.getMonth() - RANGE_MONTHS[range]);
  return points.filter((p) => p.time >= start.getTime());
}

/**
 * Trailing moving average: each point becomes the mean of weigh-ins in the `windowDays` days up
 * to and including it. Smooths day-to-day noise (water, salt) without shifting the line forward.
 * Pass all weigh-ins sorted oldest first, then trim to the range, so early points in a range
 * still average over the days before it.
 */
export function movingAverage(
  points: readonly TrendPoint[],
  windowDays = TREND_WINDOW_DAYS,
): TrendPoint[] {
  const windowMs = windowDays * DAY_MS;
  let start = 0;
  let sum = 0;
  const out: TrendPoint[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i] as TrendPoint;
    sum += point.weightKg;
    while ((points[start] as TrendPoint).time <= point.time - windowMs) {
      sum -= (points[start] as TrendPoint).weightKg;
      start += 1;
    }
    out.push({ time: point.time, weightKg: sum / (i - start + 1) });
  }
  return out;
}

export type ChartScale = {
  minTime: number;
  maxTime: number;
  minKg: number;
  maxKg: number;
  /** x in [0, width] for a time. */
  x: (time: number) => number;
  /** y in [0, height] for a weight; heavier is higher (smaller y). */
  y: (kg: number) => number;
};

/**
 * Scales points (and the goal weight, if any, so the reference line is always visible) into a
 * width × height box, with a little vertical padding. Null without points.
 */
export function chartScale(
  points: readonly TrendPoint[],
  { width, height, goalKg = null }: { width: number; height: number; goalKg?: number | null },
): ChartScale | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;
  const weights = points.map((p) => p.weightKg);
  if (goalKg !== null) weights.push(goalKg);
  let minKg = Math.min(...weights);
  let maxKg = Math.max(...weights);
  // Keep a flat line off the edges and give at least ~1 kg of vertical range.
  const pad = Math.max((maxKg - minKg) * 0.1, 0.5);
  minKg -= pad;
  maxKg += pad;
  const minTime = first.time;
  const maxTime = last.time;
  const timeSpan = maxTime - minTime;
  return {
    minTime,
    maxTime,
    minKg,
    maxKg,
    // A single point (or same-moment points) sits in the middle.
    x: (time) => (timeSpan === 0 ? width / 2 : ((time - minTime) / timeSpan) * width),
    y: (kg) => height - ((kg - minKg) / (maxKg - minKg)) * height,
  };
}

/** An SVG path ("M x y L x y …") through the points. Empty for no points. */
export function linePath(points: readonly TrendPoint[], scale: ChartScale): string {
  return points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${scale.x(p.time).toFixed(1)} ${scale.y(p.weightKg).toFixed(1)}`,
    )
    .join(' ');
}
