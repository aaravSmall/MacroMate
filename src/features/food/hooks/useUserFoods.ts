import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import {
  createUserFood,
  deleteUserFood,
  listUserFoods,
  updateUserFood,
  type UserFoodInput,
} from '../services/userFoodService';

export function useUserFoods() {
  return useQuery({ queryKey: queryKeys.userFoods.list(), queryFn: listUserFoods });
}

export function useCreateUserFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserFoodInput) => createUserFood(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.userFoods.all }),
  });
}

export function useUpdateUserFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserFoodInput }) => updateUserFood(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.userFoods.all }),
  });
}

export function useDeleteUserFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUserFood(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.userFoods.all }),
  });
}
