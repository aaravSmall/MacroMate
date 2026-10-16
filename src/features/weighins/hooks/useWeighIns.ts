import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { addWeighIn, listWeighIns, type NewWeighIn } from '../services/weighInService';

export function useWeighIns() {
  return useQuery({ queryKey: queryKeys.weighIns.list(), queryFn: () => listWeighIns() });
}

export function useAddWeighIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewWeighIn) => addWeighIn(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.weighIns.all }),
  });
}
