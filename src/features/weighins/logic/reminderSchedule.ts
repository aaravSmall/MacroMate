/**
 * Weigh-in reminder schedule. Pure: computes reminder instants from the profile's settings, in
 * the user's IANA time zone, with no date library.
 *
 * Rules:
 * - weekly: every week on `weekday` (0 = Sunday … 6 = Saturday) at `time`.
 * - biweekly: every 14 days, starting from the first `weekday` on or after the anchor date
 *   (the last weigh-in, or the day the settings changed when there's no weigh-in yet).
 * - monthly: the first `weekday` of each month (e.g. the first Sunday) at `time`.
 *
 * Daylight saving: reminders keep the same local wall-clock time. A time that doesn't exist on a
 * spring-forward day (e.g. 2:30 am) moves forward by the gap (3:30 am); a time that happens twice
 * on a fall-back day uses the first occurrence.
 */
import type { WeighInFrequency } from '@/types/domain';

type LocalDate = { y: number; m: number; d: number };

const DAY_MS = 86_400_000;

function partsInZone(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    y: get('year'),
    m: get('month'),
    d: get('day'),
    h: get('hour'),
    min: get('minute'),
    s: get('second'),
  };
}

/** Offset of `timeZone` from UTC at `instant`, in ms (e.g. -4h for EDT). */
function offsetAt(instant: Date, timeZone: string): number {
  const p = partsInZone(instant, timeZone);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant when the wall clock in `timeZone` reads the given local date and time. */
export function zonedTimeToUtc(
  date: LocalDate,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const wall = Date.UTC(date.y, date.m - 1, date.d, hour, minute);
  // Two candidates using the offsets on either side of a possible transition.
  const before = wall - offsetAt(new Date(wall - DAY_MS), timeZone);
  const after = wall - offsetAt(new Date(wall + DAY_MS), timeZone);
  const matches = (t: number) => {
    const p = partsInZone(new Date(t), timeZone);
    return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) === wall;
  };
  const valid = [before, after].filter(matches).sort((a, b) => a - b);
  if (valid[0] !== undefined) return new Date(valid[0]); // fall back: the first occurrence
  // Spring-forward gap: the wall time doesn't exist; shift forward by the gap.
  return new Date(Math.max(before, after));
}

function localDateOf(instant: Date, timeZone: string): LocalDate {
  const p = partsInZone(instant, timeZone);
  return { y: p.y, m: p.m, d: p.d };
}

function addDays(date: LocalDate, days: number): LocalDate {
  const t = new Date(Date.UTC(date.y, date.m - 1, date.d) + days * DAY_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function weekdayOf(date: LocalDate): number {
  return new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay();
}

/** The first `weekday` on or after `date`. */
function onOrAfter(date: LocalDate, weekday: number): LocalDate {
  return addDays(date, (weekday - weekdayOf(date) + 7) % 7);
}

function firstWeekdayOfMonth(y: number, m: number, weekday: number): LocalDate {
  return onOrAfter({ y, m, d: 1 }, weekday);
}

/** "08:00" / "08:00:00" → [8, 0]. */
export function parseReminderTime(time: string): [number, number] {
  const [h = '8', min = '0'] = time.split(':');
  const hour = Math.min(23, Math.max(0, Number(h) || 0));
  const minute = Math.min(59, Math.max(0, Number(min) || 0));
  return [hour, minute];
}

export type ReminderSettings = {
  frequency: WeighInFrequency;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** `HH:MM[:SS]` local time. */
  time: string;
  timeZone: string;
  /** Biweekly anchor: the last weigh-in, or when the settings changed. */
  anchor: Date;
};

/** The next `count` reminder instants strictly after `now`. */
export function nextReminderDates(
  settings: ReminderSettings,
  { now = new Date(), count = 6 }: { now?: Date; count?: number } = {},
): Date[] {
  const { frequency, weekday, timeZone } = settings;
  const [hour, minute] = parseReminderTime(settings.time);
  const at = (date: LocalDate) => zonedTimeToUtc(date, hour, minute, timeZone);
  const out: Date[] = [];
  const today = localDateOf(now, timeZone);

  if (frequency === 'monthly') {
    let { y, m } = today;
    while (out.length < count) {
      const instant = at(firstWeekdayOfMonth(y, m, weekday));
      if (instant > now) out.push(instant);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return out;
  }

  const step = frequency === 'biweekly' ? 14 : 7;
  let date =
    frequency === 'biweekly'
      ? onOrAfter(localDateOf(settings.anchor, timeZone), weekday)
      : onOrAfter(today, weekday);
  // A biweekly anchor in the past: jump ahead in whole periods to near today.
  if (frequency === 'biweekly') {
    const behind = Math.floor(
      (Date.UTC(today.y, today.m - 1, today.d) - Date.UTC(date.y, date.m - 1, date.d)) / DAY_MS,
    );
    if (behind > 0) date = addDays(date, Math.floor(behind / step) * step);
  }
  while (out.length < count) {
    const instant = at(date);
    if (instant > now) out.push(instant);
    date = addDays(date, step);
  }
  return out;
}
