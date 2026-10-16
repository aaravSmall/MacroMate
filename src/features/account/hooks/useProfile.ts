import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth';
import { queryKeys } from '@/lib/queryKeys';

import { getProfile, type ProfileUpdate, updateProfile } from '../services/profileService';

/** The signed-in user's profile. */
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: queryKeys.profile.detail(userId ?? ''),
    queryFn: () => getProfile(userId ?? ''),
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: ProfileUpdate) => {
      if (!user) throw new Error('Not signed in.');
      return updateProfile(user.id, update);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile.detail(profile.id), profile);
    },
  });
}
