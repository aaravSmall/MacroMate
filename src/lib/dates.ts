/** Local-time day helpers. A "day" is always the user's local calendar day. */

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Start of the following local day (exclusive upper bound). */
export function startOfNextLocalDay(date: Date): Date {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** `YYYY-MM-DD` in local time, for cache keys and display grouping. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a `YYYY-MM-DD` key as local midnight. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}
