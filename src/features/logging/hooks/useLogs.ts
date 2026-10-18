import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import type { LogEntry } from '@/types/domain';

import { buildLogEntry, type NewLogInput } from '../logic/snapshot';
import {
  addLog,
  deleteLog,
  getDailyTotals,
  getLog,
  getLoggedDateKeys,
  getLogsForDay,
  type LogUpdate,
  updateLog,
} from '../services/logService';

/** Logs for a local date key (`YYYY-MM-DD`). */
export function useDayLogs(dateKey: string) {
  return useQuery({
    queryKey: queryKeys.logs.day(dateKey),
    queryFn: () => getLogsForDay(dateKey),
  });
}

/** Totals for a local date key, from the `daily_totals` view. */
export function useDailyTotals(dateKey: string) {
  return useQuery({
    queryKey: queryKeys.logs.totals(dateKey),
    queryFn: () => getDailyTotals(dateKey),
  });
}

export function useLog(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.logs.detail(id ?? ''),
    queryFn: () => getLog(id ?? ''),
    enabled: !!id && !id.startsWith('optimistic-'),
  });
}

/** Set of local date keys in [fromKey, toKey) that have at least one log. */
export function useLoggedDays(fromKey: string, toKey: string) {
  return useQuery({
    queryKey: queryKeys.logs.loggedDays(fromKey, toKey),
    queryFn: () => getLoggedDateKeys(fromKey, toKey),
    select: (keys) => new Set(keys),
  });
}

function byLoggedAt(a: LogEntry, b: LogEntry) {
  return a.loggedAt.localeCompare(b.loggedAt);
}

function invalidateDay(queryClient: ReturnType<typeof useQueryClient>, dateKey: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.logs.day(dateKey) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.logs.totals(dateKey) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.logs.loggedDaysAll });
}

/** Adds a log, showing it immediately and rolling back if the save fails. */
export function useAddLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewLogInput) => addLog(input),
    onMutate: async (input) => {
      const key = queryKeys.logs.day(input.localDate);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<LogEntry[]>(key);
      const optimistic = buildLogEntry(input, `optimistic-${Date.now()}`);
      queryClient.setQueryData<LogEntry[]>(key, (old) =>
        [...(old ?? []), optimistic].sort(byLoggedAt),
      );
      return { key, previous };
    },
    onError: (_error, _input, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _error, input) => invalidateDay(queryClient, input.localDate),
  });
}

export function useUpdateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entry, update }: { entry: LogEntry; update: LogUpdate }) =>
      updateLog(entry, update),
    onSettled: (_data, _error, { entry }) => {
      invalidateDay(queryClient, entry.localDate);
      void queryClient.invalidateQueries({ queryKey: queryKeys.logs.detail(entry.id) });
    },
  });
}

/** Deletes a log, removing it immediately and restoring it if the delete fails. */
export function useDeleteLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry: LogEntry) => deleteLog(entry.id),
    onMutate: async (entry) => {
      const key = queryKeys.logs.day(entry.localDate);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<LogEntry[]>(key);
      queryClient.setQueryData<LogEntry[]>(key, (old) => old?.filter((e) => e.id !== entry.id));
      return { key, previous };
    },
    onError: (_error, _entry, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _error, entry) => invalidateDay(queryClient, entry.localDate),
  });
}
