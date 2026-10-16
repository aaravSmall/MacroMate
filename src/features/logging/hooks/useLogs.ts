import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toDateKey } from '@/lib/dates';
import { queryKeys } from '@/lib/queryKeys';
import type { LogEntry } from '@/types/domain';

import { buildLogEntry, type NewLogInput } from '../logic/snapshot';
import {
  addLog,
  deleteLog,
  getLogsForDay,
  type LogUpdate,
  updateLog,
} from '../services/logService';

export function useDayLogs(date: Date) {
  return useQuery({
    queryKey: queryKeys.logs.day(toDateKey(date)),
    queryFn: () => getLogsForDay(date),
  });
}

function byLoggedAt(a: LogEntry, b: LogEntry) {
  return a.loggedAt.localeCompare(b.loggedAt);
}

/** Adds a log, showing it immediately and rolling back if the save fails. */
export function useAddLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewLogInput) => addLog(input),
    onMutate: async (input) => {
      const key = queryKeys.logs.day(toDateKey(input.loggedAt));
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
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.logs.day(toDateKey(input.loggedAt)),
      });
      // Logging an Open Food Facts result may have created a My Foods entry.
      if (input.food.kind === 'food') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.userFoods.all });
      }
    },
  });
}

export function useUpdateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: string; update: LogUpdate }) => updateLog(id, update),
    // The entry may move to a different day, so refresh every cached day.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.logs.all }),
  });
}

/** Deletes a log, removing it immediately and restoring it if the delete fails. */
export function useDeleteLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry: LogEntry) => deleteLog(entry.id),
    onMutate: async (entry) => {
      const key = queryKeys.logs.day(toDateKey(new Date(entry.loggedAt)));
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<LogEntry[]>(key);
      queryClient.setQueryData<LogEntry[]>(key, (old) => old?.filter((e) => e.id !== entry.id));
      return { key, previous };
    },
    onError: (_error, _entry, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _error, entry) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.logs.day(toDateKey(new Date(entry.loggedAt))),
      }),
  });
}
