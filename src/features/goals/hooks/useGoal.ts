import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth';
import { queryKeys } from '@/lib/queryKeys';

import { changeGoal, getActiveGoal, type NewGoal } from '../services/goalService';

/** The signed-in user's active goal. */
export function useActiveGoal() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: queryKeys.goals.active(userId ?? ''),
    queryFn: () => getActiveGoal(userId ?? ''),
    enabled: !!userId,
  });
}

/** Ends the active goal (if any) and starts a new one, atomically. */
export function useChangeGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: NewGoal) => {
      if (!user) throw new Error('Not signed in.');
      return changeGoal(goal);
    },
    onSuccess: (goal) => {
      if (user) queryClient.setQueryData(queryKeys.goals.active(user.id), goal);
    },
  });
}
