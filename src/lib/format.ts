import type { UnitSystem } from '@/types/domain';

const KG_PER_LB = 0.45359237;

/** Whole calories with thousands separators, e.g. "1,250". */
export function formatKcal(kcal: number): string {
  return Math.round(kcal).toLocaleString('en-US');
}

/** Grams with at most one decimal, e.g. "12.5 g". */
export function formatGrams(grams: number): string {
  return `${Math.round(grams * 10) / 10} g`;
}

/** Local time, e.g. "8:12 AM". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatWeight(kg: number, units: UnitSystem): string {
  return units === 'imperial'
    ? `${(Math.round((kg / KG_PER_LB) * 10) / 10).toFixed(1)} lb`
    : `${(Math.round(kg * 10) / 10).toFixed(1)} kg`;
}

export function formatServing(size: number, unit: string): string {
  return `${Math.round(size * 100) / 100} ${unit}`;
}

/** "Today", "Yesterday", "Tomorrow", or e.g. "Wed, Oct 14". */
export function formatDayLabel(date: Date, today: Date = new Date()): string {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const ref = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((day - ref) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Parses a user-typed number; returns null for empty or invalid input. */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
