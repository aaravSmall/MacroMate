import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { getExerciseForDay } from '../services/exerciseService';

export function useDayExercise(dateKey: string) {
  return useQuery({
    queryKey: queryKeys.exercise.day(dateKey),
    queryFn: () => getExerciseForDay(dateKey),
  });
}
