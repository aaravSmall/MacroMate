import { useQuery } from '@tanstack/react-query';

import { toDateKey } from '@/lib/dates';
import { queryKeys } from '@/lib/queryKeys';

import { getExerciseForDay } from '../services/exerciseService';

export function useDayExercise(date: Date) {
  return useQuery({
    queryKey: queryKeys.exercise.day(toDateKey(date)),
    queryFn: () => getExerciseForDay(date),
  });
}
