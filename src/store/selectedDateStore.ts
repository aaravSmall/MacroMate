import { create } from 'zustand';

import { addDays, fromDateKey, toDateKey } from '@/lib/dates';

type SelectedDateState = {
  /** `YYYY-MM-DD` of the day shown on Today. */
  dateKey: string;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  goToDate: (dateKey: string) => void;
};

/** Which day the Today tab is showing. UI state only. */
export const useSelectedDateStore = create<SelectedDateState>((set) => ({
  dateKey: toDateKey(new Date()),
  goToPreviousDay: () => set((s) => ({ dateKey: toDateKey(addDays(fromDateKey(s.dateKey), -1)) })),
  goToNextDay: () => set((s) => ({ dateKey: toDateKey(addDays(fromDateKey(s.dateKey), 1)) })),
  goToToday: () => set({ dateKey: toDateKey(new Date()) }),
  goToDate: (dateKey) => set({ dateKey }),
}));

/**
 * When logging onto the selected day: now if it's today, otherwise that day at the current
 * time of day.
 */
export function logTimeForDateKey(dateKey: string, now: Date = new Date()): Date {
  if (dateKey === toDateKey(now)) return now;
  const date = fromDateKey(dateKey);
  date.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return date;
}
