import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import {
  cacheOpenFoodFactsFood,
  createFood,
  deleteFood,
  getFood,
  searchFoods,
} from '../services/foodService';
import type { NewFoodInput } from '../services/mappers';
import { getMyVerification, verifyFood } from '../services/verificationService';

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

export function useCreateFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewFoodInput) => createFood(input),
    onSuccess: (food) => {
      queryClient.setQueryData(queryKeys.foods.detail(food.id), food);
      void queryClient.invalidateQueries({ queryKey: queryKeys.foods.searchAll });
    },
  });
}

/** Caches an Open Food Facts product (by barcode) as a global food and returns it. */
export function useCacheOpenFoodFactsFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => cacheOpenFoodFactsFood(code),
    onSuccess: (food) => {
      queryClient.setQueryData(queryKeys.foods.detail(food.id), food);
      // Search should now list the cached row (with its counts) instead of the live result.
      void queryClient.invalidateQueries({ queryKey: queryKeys.foods.searchAll });
    },
  });
}

export function useDeleteFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFood(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.foods.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.foods.searchAll });
    },
  });
}

/** The user's earlier answer to "Does this match your label?", or null. */
export function useMyVerification(foodId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.foods.verification(foodId),
    queryFn: () => getMyVerification(foodId),
    enabled,
  });
}

export function useVerifyFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ foodId, matches }: { foodId: string; matches: boolean }) =>
      verifyFood(foodId, matches),
    onSuccess: (_data, { foodId, matches }) => {
      queryClient.setQueryData(queryKeys.foods.verification(foodId), matches);
      // Counts changed on the food.
      void queryClient.invalidateQueries({ queryKey: queryKeys.foods.detail(foodId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.foods.searchAll });
    },
  });
}
