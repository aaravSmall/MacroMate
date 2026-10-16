import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { getFood, searchFoods } from '../services/foodService';

export const MIN_SEARCH_LENGTH = 2;

/** Pass an already-debounced query; searches start at MIN_SEARCH_LENGTH characters. */
export function useFoodSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.foods.search(trimmed.toLowerCase()),
    queryFn: ({ signal }) => searchFoods(trimmed, { signal }),
    enabled: trimmed.length >= MIN_SEARCH_LENGTH,
    staleTime: 5 * 60_000,
  });
}

export function useFood(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.foods.detail(id ?? ''),
    queryFn: ({ signal }) => getFood(id ?? '', signal),
    enabled: !!id,
    staleTime: 30 * 60_000,
  });
}
